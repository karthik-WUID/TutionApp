import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createOxfordProvider, dictionaryWord, normalizeOxford } from '../server/oxford-dictionary.mjs';
import { createDictionaryPictureProvider } from '../server/dictionary-pictures.mjs';
import { createApp } from '../server/app.mjs';
import { oxfordWords, oxfordThesaurus } from './dictionary-fixtures.mjs';
const json = (data) => new Response(JSON.stringify(data), { headers: { 'Content-Type': 'application/json' } });
const options = { appId: 'test-id', appKey: 'test-secret', mode: 'production' };

describe('Oxford dictionary integration', () => {
  it('uses current Words and English Thesaurus endpoints with server-only authentication', async () => {
    const calls = [];
    const provider = createOxfordProvider({ ...options, fetchImpl: async (url, init) => { calls.push({ url, init }); return json(url.includes('/words/') ? oxfordWords : oxfordThesaurus); } });
    const result = await provider.lookup('  APPLE  ', 'en-us');
    assert.equal(calls[0].url, 'https://od-api.oxforddictionaries.com/api/v2/words/en-us?q=apple');
    assert.equal(calls[1].url, 'https://od-api.oxforddictionaries.com/api/v2/thesaurus/en/apple?fields=synonyms,antonyms');
    assert.equal(calls[0].init.headers.app_key, 'test-secret'); assert.equal(calls[0].init.redirect, 'error');
    assert.equal(result.entries[0].senses.length, 2); assert.equal(result.entries[0].senses[1].depth, 1);
    assert.deepEqual(result.thesaurus[0].senses[0].synonyms, ['test synonym', 'test alternative']);
    assert.deepEqual(result.thesaurus[0].senses[0].antonyms, ['test opposite']);
    assert.match(result.attribution, /Oxford University Press/);
    assert.equal(JSON.stringify(result).includes('test-secret'), false);
    await provider.lookup('apple'); assert.equal(calls.length, 4, 'dictionary content is not cached');
  });
  it('resolves inflected input to its Oxford headword before looking up synonyms', async () => {
    const payload = structuredClone(oxfordWords); payload.results[0].word = 'walk'; payload.results[0].lexicalEntries[0].text = 'walk';
    const calls = [];
    const provider = createOxfordProvider({ ...options, fetchImpl: async (url) => { calls.push(url); return json(url.includes('/words/') ? payload : oxfordThesaurus); } });
    const result = await provider.lookup('walking');
    assert.equal(result.query, 'walking'); assert.equal(result.word, 'walk'); assert.match(calls[1], /thesaurus\/en\/walk\?/);
  });
  it('rejects missing credentials, unsupported variants, invalid words and sandbox restrictions before network calls', async () => {
    let calls = 0; const fetchImpl = async () => { calls++; return json(oxfordWords); };
    const missing = createOxfordProvider({ appId: '', appKey: '', fetchImpl });
    assert.equal(missing.status().configured, false); assert.equal(JSON.stringify(missing.status()).includes('appKey'), false);
    await assert.rejects(missing.lookup('apple'), (e) => e.code === 'NOT_CONFIGURED');
    const provider = createOxfordProvider({ ...options, fetchImpl });
    for (const word of ['https://example.com', '../secret', '', 'a'.repeat(81), ['apple', 'cat']]) assert.throws(() => dictionaryWord(word), (e) => e.status === 400);
    await assert.rejects(provider.lookup('apple', 'ta'), (e) => e.status === 400);
    const sandbox = createOxfordProvider({ ...options, mode: 'sandbox', fetchImpl });
    await assert.rejects(sandbox.lookup('banana'), (e) => e.code === 'SANDBOX_WORD'); assert.equal(calls, 0);
    await sandbox.lookup('apple'); assert.equal(calls, 2);
  });
  it('reports missing words, provider access failures, quotas and malformed or oversized responses without leaking provider data', async () => {
    for (const [response, status, code] of [[() => new Response('test-secret', { status: 404 }), 404, 'NOT_FOUND'], [() => new Response('test-secret', { status: 403 }), 503, 'ACCESS_DENIED'], [() => new Response('test-secret', { status: 429 }), 429, 'QUOTA'], [() => new Response('test-secret'), 503, 'UNAVAILABLE'], [() => json({ results: [] }), 503, 'UNAVAILABLE'], [() => new Response('x', { headers: { 'Content-Length': String(3 * 1024 * 1024) } }), 503, 'UNAVAILABLE']]) {
      const provider = createOxfordProvider({ ...options, fetchImpl: async () => response() });
      await assert.rejects(provider.lookup('apple'), (e) => e.status === status && e.code === code && !e.message.includes('test-secret'));
    }
    const provider = createOxfordProvider({ ...options, fetchImpl: async () => { throw new Error('test-secret'); } });
    await assert.rejects(provider.lookup('apple'), (e) => e.status === 503 && !e.message.includes('test-secret'));
  });
  it('retains definitions and sense synonyms when the extra thesaurus subscription is unavailable', async () => {
    const provider = createOxfordProvider({ ...options, fetchImpl: async (url) => url.includes('/words/') ? json(oxfordWords) : new Response('', { status: 403 }) });
    const result = await provider.lookup('apple');
    assert.equal(result.entries[0].senses[0].definitions.length, 1); assert.deepEqual(result.entries[0].senses[0].synonyms, ['test fruit']);
    assert.equal(result.thesaurus.length, 0); assert.match(result.synonymNote, /Thesaurus access/);
    const unsafe = structuredClone(oxfordWords); unsafe.results[0].lexicalEntries[0].pronunciations[0].audioFile = 'https://evil.example/audio.mp3';
    assert.equal(normalizeOxford(unsafe)[0].pronunciations[0].audioUrl, null);
  });
  it('validates demo profiles and duplicate parameters and returns no-store responses with safe errors', async () => {
    let calls = 0;
    const provider = createOxfordProvider({ ...options, fetchImpl: async (url) => { calls++; return json(url.includes('/words/') ? oxfordWords : oxfordThesaurus); } });
    const app = createApp({ oxfordProvider: provider, dictionaryPictureProvider: { lookup: async () => ({ picture: null }) } });
    const server = app.listen(0, '127.0.0.1'); await new Promise((r) => server.once('listening', r));
    const request = (path) => fetch(`http://127.0.0.1:${server.address().port}/api/dictionary/${path}`);
    try {
      for (const path of ['oxford?userId=unknown&word=apple', 'oxford?userId=aanya&word=apple&word=cat', 'oxford?userId=aanya&word=apple&language=ta', 'picture?userId=aanya&word=../secret']) assert.equal((await request(path)).status, 400);
      assert.equal(calls, 0);
      const status = await request('oxford/status?userId=aanya'); assert.equal(status.headers.get('cache-control'), 'no-store'); assert.equal((await status.json()).configured, true);
      const result = await request('oxford?userId=aanya&word=apple'); assert.equal(result.status, 200); assert.equal(result.headers.get('cache-control'), 'no-store'); assert.equal((await result.json()).entries.length, 1);
      assert.equal((await request('picture?userId=aanya&word=apple')).status, 200);
    } finally { await new Promise((r) => server.close(r)); app.locals.store.db.close(); }
  });
});
describe('Dictionary picture integration', () => {
  const article = { query: { pages: [{ title: 'Apple', thumbnail: { source: 'https://thumb.wikimedia.org/wikipedia/commons/apple.jpg' }, pageimage: 'Apple.jpg' }] } };
  const file = { query: { pages: [{ imageinfo: [{ descriptionurl: 'https://commons.wikimedia.org/wiki/File:Apple.jpg', extmetadata: { LicenseShortName: { value: 'CC BY-SA 4.0' }, Artist: { value: '<a href="https://evil.example">Test photographer</a>' }, LicenseUrl: { value: 'https://creativecommons.org/licenses/by-sa/4.0/' }, ImageDescription: { value: '<p>Apple fruit</p>' } } }] }] } };
  it('looks up only a related article’s free picture and supplies plain-text creator and license attribution', async () => {
    const calls = []; const provider = createDictionaryPictureProvider({ fetchImpl: async (url) => { calls.push(url); return json(url.includes('en.wikipedia') ? article : file); } });
    const result = await provider.lookup('apple');
    assert.equal(new URL(calls[0]).searchParams.get('pilicense'), 'free'); assert.equal(new URL(calls[1]).searchParams.get('titles'), 'File:Apple.jpg');
    assert.equal(result.picture.artist, 'Test photographer'); assert.equal(result.picture.description, 'Apple fruit'); assert.equal(result.picture.license, 'CC BY-SA 4.0'); assert.match(result.note, /separate from Oxford/);
  });
  it('does not invent pictures for abstract/missing words, ambiguous articles, untrusted URLs or missing attribution', async () => {
    const cases = [ { query: { pages: [{ title: 'Word', missing: true }] } }, { query: { pages: [{ ...article.query.pages[0], pageprops: { disambiguation: '' } }] } }, { query: { pages: [{ ...article.query.pages[0], thumbnail: { source: 'https://evil.example/image.jpg' } }] } } ];
    for (const data of cases) { const p = createDictionaryPictureProvider({ fetchImpl: async () => json(data) }); assert.equal((await p.lookup('word')).picture, null); }
    const p = createDictionaryPictureProvider({ fetchImpl: async (url) => json(url.includes('en.wikipedia') ? article : { query: { pages: [{ imageinfo: [{ descriptionurl: file.query.pages[0].imageinfo[0].descriptionurl, extmetadata: {} }] }] } }) });
    assert.equal((await p.lookup('apple')).picture, null);
  });
});
