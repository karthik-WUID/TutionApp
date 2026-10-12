// Oxford credentials stay on the server. Dictionary content is never persisted or cached.
const problem = (status, message, code) => Object.assign(new Error(message), { status, code });
const list = (value) => Array.isArray(value) ? value : [];
const text = (value) => typeof value === 'string' ? value : '';
const words = (value) => list(value).map((v) => text(v?.text)).filter(Boolean);
export function dictionaryWord(value) {
  if (typeof value !== 'string') throw problem(400, 'Enter an English word or phrase.');
  const word = value.normalize('NFC').trim().replace(/\s+/g, ' ').toLowerCase();
  if (!word || word.length > 80 || !/^[\p{L}\p{M}][\p{L}\p{M} '\u2019-]*$/u.test(word)) throw problem(400, 'Use a word or phrase of up to 80 letters, spaces, apostrophes or hyphens.');
  return word;
}
export function safeDictionaryUrl(value, hosts) {
  try { const url = new URL(value); return url.protocol === 'https:' && hosts.includes(url.hostname) && !url.username && !url.password && !url.port ? url.href : null; } catch { return null; }
}
export async function readDictionaryJson(response) {
  const limit = 2 * 1024 * 1024;
  if (Number(response.headers.get('content-length')) > limit) { await response.body?.cancel(); throw new Error('Response too large'); }
  const reader = response.body?.getReader();
  if (!reader) throw new Error('Empty response');
  let size = 0; const chunks = [];
  try { for (;;) { const { done, value } = await reader.read(); if (done) break; size += value.length; if (size > limit) throw new Error('Response too large'); chunks.push(value); } }
  finally { await reader.cancel().catch(() => {}); }
  return JSON.parse(Buffer.concat(chunks).toString('utf8'));
}
function senses(items, depth = 0) {
  if (depth > 12) throw new Error('Invalid sense hierarchy');
  return list(items).flatMap((sense) => [{
    id: text(sense.id), depth,
    definitions: list(sense.definitions).filter((v) => typeof v === 'string'),
    examples: words(sense.examples), synonyms: words(sense.synonyms), antonyms: words(sense.antonyms),
    labels: [...words(sense.registers), ...words(sense.domains), ...words(sense.regions)],
  }, ...senses(sense.subsenses, depth + 1)]).filter((s) => s.definitions.length || s.examples.length || s.synonyms.length || s.antonyms.length);
}
export function normalizeOxford(payload) {
  if (!Array.isArray(payload?.results) || !payload.results.length) throw new Error('Invalid Oxford result');
  return payload.results.flatMap((result) => list(result.lexicalEntries).map((lexical) => {
    const entries = list(lexical.entries);
    const pronunciations = [...list(lexical.pronunciations), ...entries.flatMap((e) => list(e.pronunciations))].map((p) => ({
      spelling: text(p.phoneticSpelling), notation: text(p.phoneticNotation), dialects: list(p.dialects).filter((v) => typeof v === 'string'),
      audioUrl: safeDictionaryUrl(p.audioFile, ['audio.oxforddictionaries.com']),
    })).filter((p) => p.spelling || p.audioUrl);
    return { word: text(lexical.text) || text(result.word), partOfSpeech: text(lexical.lexicalCategory?.text), pronunciations: [...new Map(pronunciations.map((p) => [JSON.stringify(p), p])).values()], senses: entries.flatMap((e) => senses(e.senses)) };
  })).filter((entry) => entry.senses.length);
}
export function createOxfordProvider({ appId = process.env.OXFORD_APP_ID, appKey = process.env.OXFORD_APP_KEY, mode = process.env.OXFORD_API_MODE || 'production', fetchImpl = fetch } = {}) {
  const configured = !!appId?.trim() && !!appKey?.trim() && ['production', 'sandbox'].includes(mode);
  const base = mode === 'sandbox' ? 'https://od-api-sandbox.oxforddictionaries.com/api/v2' : 'https://od-api.oxforddictionaries.com/api/v2';
  async function request(path) {
    try {
      const response = await fetchImpl(`${base}${path}`, { headers: { app_id: appId, app_key: appKey, Accept: 'application/json' }, signal: AbortSignal.timeout(12000), redirect: 'error' });
      if (!response.ok) {
        await response.body?.cancel();
        if (response.status === 404) throw problem(404, 'Oxford has no entry for this word. Check the spelling or try another word.', 'NOT_FOUND');
        if ([401, 403].includes(response.status)) throw problem(503, 'Oxford access is unavailable. Ask your tutor to check the dictionary subscription and credentials.', 'ACCESS_DENIED');
        if (response.status === 429) throw problem(429, 'Oxford’s request allowance has been reached. Please try again later.', 'QUOTA');
        throw new Error('Provider unavailable');
      }
      return await readDictionaryJson(response);
    } catch (error) {
      if (error.code && error.status) throw error;
      throw problem(503, 'Oxford is temporarily unavailable. Please try again.', 'UNAVAILABLE');
    }
  }
  return {
    status: () => ({ configured, mode, source: 'Oxford Dictionaries', languages: [{ id: 'en-gb', label: 'British English' }, { id: 'en-us', label: 'American English' }], note: mode === 'sandbox' ? 'Oxford Sandbox covers words beginning with “a” only.' : 'Live Oxford English dictionary and thesaurus.' }),
    async lookup(input, language = 'en-gb') {
      const word = dictionaryWord(input);
      if (!['en-gb', 'en-us'].includes(language)) throw problem(400, 'Choose British or American English.');
      if (!configured) throw problem(503, 'Oxford dictionary is waiting for activation. Ask your tutor to enable Oxford access.', 'NOT_CONFIGURED');
      if (mode === 'sandbox' && !word.startsWith('a')) throw problem(400, 'Oxford Sandbox supports words beginning with “a” only. Try “apple” or use a production subscription.', 'SANDBOX_WORD');
      let entries;
      try { entries = normalizeOxford(await request(`/words/${language}?${new URLSearchParams({ q: word })}`)); }
      catch (error) { if (error.code) throw error; throw problem(503, 'Oxford returned an unreadable entry. Please try again.', 'UNAVAILABLE'); }
      if (!entries.some((e) => e.senses.some((s) => s.definitions.length))) throw problem(404, 'Oxford has no definition for this word. Try another word.', 'NOT_FOUND');
      const headword = entries[0].word || word;
      let thesaurus = [], synonymNote = '';
      try { thesaurus = normalizeOxford(await request(`/thesaurus/en/${encodeURIComponent(dictionaryWord(headword))}?fields=synonyms,antonyms`)); }
      catch (error) { synonymNote = error.code === 'NOT_FOUND' ? 'Oxford has no additional thesaurus entry for this word.' : error.code === 'ACCESS_DENIED' ? 'Additional synonyms need Oxford Thesaurus access on your subscription.' : error.code === 'QUOTA' ? 'The Oxford allowance was reached while loading additional synonyms.' : 'Additional Oxford synonyms are temporarily unavailable.'; }
      return { query: word, word: headword, language, entries, thesaurus, synonymNote, source: 'Oxford Dictionaries', attribution: `Content provided by Oxford Dictionaries, ${new Date().getUTCFullYear()}. © Oxford University Press.`, fetchedAt: new Date().toISOString() };
    },
  };
}
export function registerOxfordDictionary(app, { store, provider = createOxfordProvider(), pictureProvider }) {
  const viewer = (req, res) => { res.setHeader('Cache-Control', 'no-store'); if (typeof req.query.userId !== 'string' || !store.user(req.query.userId)) throw problem(400, 'Please select a classroom profile.'); };
  app.get('/api/dictionary/oxford/status', (req, res) => { viewer(req, res); res.json(provider.status()); });
  app.get('/api/dictionary/oxford', async (req, res) => {
    viewer(req, res);
    const word = dictionaryWord(req.query.word), language = req.query.language ?? 'en-gb';
    if (!['en-gb', 'en-us'].includes(language)) throw problem(400, 'Choose British or American English.');
    try { res.json(await provider.lookup(word, language)); }
    catch (error) { res.status([400, 404, 429, 503].includes(error.status) ? error.status : 503).json({ error: error.code ? error.message : 'Oxford is temporarily unavailable. Please try again.', code: error.code || 'UNAVAILABLE' }); }
  });
  app.get('/api/dictionary/picture', async (req, res) => {
    viewer(req, res);
    const word = dictionaryWord(req.query.word);
    try { res.json(await pictureProvider.lookup(word)); }
    catch { res.status(503).json({ error: 'Related pictures are temporarily unavailable. Please try again.' }); }
  });
}
