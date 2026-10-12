import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createCollinsProvider } from '../server/collins-directory.mjs';
import { createApp } from '../server/app.mjs';

const anchor = (slug, title, kind = 'books_series', host = 'collins.in') => `<a href="https://${host}/${kind}/${slug}/"><div class="book-name"><p>${title}</p></div></a>`;
const series = '<h1>Social Science</h1><li><span class="bold-text">Class</span>Class 6, Class 7, Class 8</li>' + anchor('collins-social-science-6', 'Collins Social Science 6', 'books') + anchor('collins-social-science-7', 'Collins Social Science 7', 'books');
const catalogue = () => new Response(JSON.stringify({ book: anchor('cascade', 'Cascade') + anchor('revised-excursions', 'Revised Excursions'), total: 0 }), { headers: { 'Content-Type': 'application/json' } });
const options = { grade: 6, subject: 'Social Studies', kind: 'textbooks', query: '', offset: 0 };
const fixtureFetch = async (url) => url.endsWith('admin-ajax.php') ? catalogue() : new Response(series);
describe('Collins public catalogue integration', () => {
  it('uses the public catalogue action and category/stage filters and counts actual series', async () => {
    const calls = [];
    const provider = createCollinsProvider({ fetchImpl: async (url, init) => { calls.push({ url, body: init.body }); return fixtureFetch(url); } });
    const result = await provider.directory(options);
    assert.equal(calls[0].url, 'https://collins.in/wp-admin/admin-ajax.php');
    const sent = new URLSearchParams(calls[0].body);
    assert.equal(sent.get('action'), 'book_search_by_category'); assert.equal(sent.get('category[]'), 'social-science'); assert.equal(sent.get('stage[]'), 'middle');
    assert.equal(result.total, 3); assert.equal(result.source, 'Collins');
    assert.equal(result.items.at(-1).id, 'collins_series_social-science');
    assert.match(result.note, /exact class and edition/);
    assert.equal((await provider.directory({ ...options, query: 'Social Science' })).items.length, 1);
  });
  it('supports Computer Science and Value Education, without broadening missing Tamil or lessons', async () => {
    const categories = [];
    const provider = createCollinsProvider({ fetchImpl: async (_url, init) => { categories.push(new URLSearchParams(init.body).get('category[]')); return catalogue(); } });
    await provider.directory({ ...options, subject: 'Computer Science' });
    await provider.directory({ ...options, subject: 'Value Education' });
    assert.deepEqual(categories, ['computer-science', 'value-education']);
    for (const change of [{ subject: 'Tamil' }, { kind: 'lessons' }, { subject: 'Unknown' }]) {
      assert.equal((await provider.directory({ ...options, ...change })).total, 0);
    }
    assert.equal(categories.length, 2);
  });
  it('reads class-specific book links and keeps full book access on the publisher', async () => {
    let calls = 0;
    const provider = createCollinsProvider({ fetchImpl: async () => { calls++; return new Response(series + anchor('evs-1', 'Cascade 1 (EVS)', 'books') + anchor('evil', 'Untrusted book', 'books', 'evil.example')); } });
    await assert.rejects(provider.resource('collins_series_../../private'), (e) => e.status === 400);
    await assert.rejects(provider.resource('collins_series_social-science', 'collins_series_other'), (e) => e.status === 400);
    assert.equal(calls, 0);
    const result = await provider.resource('collins_series_social-science', undefined, 6);
    assert.deepEqual(result.item.grades, ['Class 6', 'Class 7', 'Class 8']);
    assert.equal(result.children.length, 1); assert.equal(result.children[0].format, 'link'); assert.equal(result.children[0].mediaUrl, null);
    assert.match(result.children[0].sourceUrl, /^https:\/\/collins\.in\/books\//);
    assert.match(result.note, /Full e-books/);
  });
  it('uses a bounded, dated cache during outages and expires old copies', async () => {
    let clock = 0, down = false, calls = 0;
    const provider = createCollinsProvider({ now: () => clock, fetchImpl: async () => { calls++; return down ? new Response('', { status: 503 }) : catalogue(); } });
    const selection = { ...options, subject: 'Computer Science' };
    await Promise.all([provider.directory(selection), provider.directory(selection)]); assert.equal(calls, 1);
    clock = 300_001; down = true;
    const result = await provider.directory(selection); assert.equal(result.stale, true); assert.equal(result.fetchedAt, new Date(0).toISOString());
    clock = 86_400_001; await assert.rejects(provider.directory(selection), (e) => e.status === 503);
  });
  it('reports malformed, denied and oversized publisher responses', async () => {
    for (const make of [() => new Response('not JSON'), () => new Response('', { status: 401 }), () => new Response('{}'), () => new Response('{}', { headers: { 'content-length': '4000001' } })]) {
      const provider = createCollinsProvider({ fetchImpl: async () => make() });
      await assert.rejects(provider.directory({ ...options, subject: 'Computer Science' }), (e) => e.status === 503);
    }
  });
  it('routes Collins requests through the app and validates classes before fetching', async () => {
    const app = createApp({ collinsProvider: createCollinsProvider({ fetchImpl: fixtureFetch }) });
    const server = app.listen(0, '127.0.0.1'); await new Promise((r) => server.once('listening', r));
    const origin = `http://127.0.0.1:${server.address().port}`;
    try {
      const query = new URLSearchParams({ userId: 'aanya', board: 'Matriculation / Collins', grade: '6', medium: 'English', kind: 'textbooks', subject: 'Social Studies' });
      const result = await fetch(origin + '/api/curriculum/directory?' + query);
      assert.equal(result.status, 200); assert.equal((await result.json()).source, 'Collins');
      const detail = await fetch(origin + '/api/curriculum/resources/collins_series_social-science?userId=aanya&grade=6');
      assert.equal(detail.status, 200); assert.equal((await detail.json()).children.length, 1);
      assert.equal((await fetch(origin + '/api/curriculum/resources/collins_series_social-science?userId=aanya&grade=99')).status, 400);
    } finally { server.closeAllConnections(); await new Promise((r) => server.close(r)); app.locals.store.db.close(); }
  });
});
