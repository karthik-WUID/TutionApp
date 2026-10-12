// Read-only public catalogue used by the publisher's own Books page.
// Digital book contents and sample-book registration stay on Collins.
const ORIGIN = 'https://collins.in';
const SERIES_ID = /^collins_series_([a-z0-9][a-z0-9-]{0,120})$/;
const PAGE_SIZE = 20;
const categories = {
  'Social Studies': 'social-science', Mathematics: 'mathematics', Science: 'science',
  English: 'english-language-teaching', 'Environmental Studies': 'environmental-studies',
  'Computer Science': 'computer-science', Hindi: 'hindi', French: 'french',
  Sanskrit: 'sanskrit', 'General Knowledge': 'general-knowledge', Atlas: 'atlas',
  'Value Education': 'value-education',
};
const error = (status, message) => Object.assign(new Error(message), { status });
const text = (html = '', limit = 240) => html.replace(/<[^>]*>/g, ' ').replace(/&#(x[\da-f]+|\d+);/gi, (_, code) => {
  const n = code[0].toLowerCase() === 'x' ? parseInt(code.slice(1), 16) : Number(code);
  return n > 0 && n <= 0x10ffff ? String.fromCodePoint(n) : '';
}).replace(/&(amp|quot|apos|lt|gt|nbsp);/g, (_, name) => ({ amp: '&', quot: '"', apos: "'", lt: '<', gt: '>', nbsp: ' ' })[name]).replace(/\s+/g, ' ').trim().slice(0, limit);
function links(html, type) {
  const matches = [...html.matchAll(/<a\b[^>]*\bhref=["'](https:\/\/collins\.in\/(books_series|books)\/([a-z0-9][a-z0-9-]{0,120})\/)["'][^>]*>([\s\S]*?)<\/a>/gi)];
  const seen = new Set();
  return matches.filter((m) => m[2] === type).map((m) => {
    const title = text(m[4].match(/<p\b[^>]*>([\s\S]*?)<\/p>/i)?.[1]);
    if (!title || seen.has(m[1])) return null;
    seen.add(m[1]);
    return { id: `collins_${type === 'books_series' ? 'series' : 'book'}_${m[3]}`, title, sourceUrl: m[1] };
  }).filter(Boolean).slice(0, 100);
}
const normalize = (item, { subjects = [], grades = [], series = true } = {}) => ({
  ...item, description: '', board: [], grades, mediums: [], subjects,
  category: series ? 'Publisher book series' : 'Publisher book', format: series ? 'collection' : 'link',
  mediaUrl: null, creator: 'HarperCollins India', license: '', source: 'Collins', access: 'publisher-account',
});
const listedGrades = (html) => {
  const classInfo = html.match(/<li\b[^>]*>\s*<span\b[^>]*>Class<\/span>([\s\S]*?)<\/li>/i)?.[1] || '';
  return [...new Set([...text(classInfo).matchAll(/Class\s+(1[0-2]|[1-9])\b/g)].map((m) => `Class ${m[1]}`))];
};
export function createCollinsProvider({ fetchImpl = fetch, now = Date.now, timeoutMs = 12000 } = {}) {
  const cache = new Map(), pending = new Map();
  async function request(path, body) {
    const key = JSON.stringify([path, body]), previous = cache.get(key);
    if (previous && now() - previous.at < 300_000) return { ...previous, cached: true, stale: false };
    if (pending.has(key)) return pending.get(key);
    const task = (async () => {
      try {
        const response = await fetchImpl(ORIGIN + path, { method: body ? 'POST' : 'GET', redirect: 'error', signal: AbortSignal.timeout(timeoutMs), headers: { Accept: body ? 'application/json' : 'text/html', ...(body ? { 'Content-Type': 'application/x-www-form-urlencoded' } : {}) }, ...(body ? { body: new URLSearchParams(body).toString() } : {}) });
        if (!response.ok) throw error(response.status === 404 ? 404 : 503, response.status === 404 ? 'This Collins series is no longer available.' : 'The Collins catalogue is temporarily unavailable. Open the official catalogue or try again.');
        if (Number(response.headers.get('content-length')) > 4_000_000) throw error(503, 'Open this large catalogue on Collins.');
        const chunks = [], reader = response.body.getReader(); let bytes = 0;
        try {
          while (true) {
            const { done, value } = await reader.read(); if (done) break;
            bytes += value.byteLength;
            if (bytes > 4_000_000) { await reader.cancel(); throw error(503, 'Open this large catalogue on Collins.'); }
            chunks.push(value);
          }
        } finally { reader.releaseLock(); }
        const raw = Buffer.concat(chunks).toString('utf8');
        const data = body ? JSON.parse(raw) : raw;
        if (body && (typeof data?.book !== 'string' || !Object.hasOwn(data, 'total'))) throw error(503, 'Collins returned an incomplete catalogue. Open its official directory.');
        if (!body && !/<h1\b/i.test(data)) throw error(503, 'Collins returned an incomplete series page. Open it on Collins.');
        const result = { data, at: now() };
        if (cache.size >= 100) cache.delete(cache.keys().next().value);
        cache.set(key, result); return { ...result, cached: false, stale: false };
      } catch (e) {
        if (e.status !== 404 && previous && now() - previous.at < 86_400_000) return { ...previous, cached: true, stale: true };
        if (e.status) throw e;
        throw error(503, 'The Collins catalogue could not be reached. Try again or open its official directory.');
      }
    })();
    pending.set(key, task); try { return await task; } finally { pending.delete(key); }
  }
  return {
    async directory({ grade, subject, kind, query, offset }) {
      const stage = grade <= 2 ? 'foundational' : grade <= 5 ? 'preparatory' : grade <= 8 ? 'middle' : 'secondary';
      const stageLabel = `${stage[0].toUpperCase() + stage.slice(1)} stage`;
      const note = 'Publisher catalogue series are grouped by school stage. Open a series to check the exact class and edition. Full digital books and lessons use your school’s Collins access.';
      const empty = { items: [], total: 0, offset, limit: PAGE_SIZE, subjects: Object.keys(categories), fetchedAt: new Date(now()).toISOString(), cached: false, stale: false, source: 'Collins', note };
      // Collins does not list Tamil as a public catalogue category. A missing
      // category must not accidentally broaden to every publisher book.
      if (kind !== 'textbooks' || (subject && !categories[subject])) return empty;
      const response = await request('/wp-admin/admin-ajax.php', { action: 'book_search_by_category', offset: '0', sort_book: '', 'stage[]': stage, ...(subject ? { 'category[]': categories[subject] } : {}) });
      let items = links(response.data.book, 'books_series').map((item) => normalize(item, { subjects: subject ? [subject] : [], grades: [stageLabel] }));
      const responses = [response];
      // This current series is listed on the Books page but is missing from
      // some publisher category responses. Read its official page to verify
      // class membership before including it alongside the older series.
      if (grade >= 6 && grade <= 8 && (!subject || subject === 'Social Studies')) {
        const current = await request('/books_series/social-science/'); responses.push(current);
        if (listedGrades(current.data).includes(`Class ${grade}`) && !items.some((item) => item.id === 'collins_series_social-science')) {
          const title = text(current.data.match(/<h1\b[^>]*>([\s\S]*?)<\/h1>/i)?.[1]);
          if (title) items.push(normalize({ id: 'collins_series_social-science', title, sourceUrl: `${ORIGIN}/books_series/social-science/` }, { subjects: ['Social Studies'], grades: listedGrades(current.data) }));
        }
      }
      if (query) items = items.filter((item) => item.title.toLocaleLowerCase().includes(query.toLocaleLowerCase()));
      // The publisher's total counts individual books (and can be zero while
      // series are present); paginate the actual returned series consistently.
      return { ...empty, items: items.slice(offset, offset + PAGE_SIZE), total: items.length, fetchedAt: new Date(Math.min(...responses.map((r) => r.at))).toISOString(), cached: responses.every((r) => r.cached), stale: responses.some((r) => r.stale) };
    },
    async resource(id, rootId = id, grade) {
      const match = typeof id === 'string' && id.match(SERIES_ID);
      if (!match || rootId !== id) throw error(400, 'Choose a valid Collins book series.');
      const response = await request(`/books_series/${match[1]}/`);
      const title = text(response.data.match(/<h1\b[^>]*>([\s\S]*?)<\/h1>/i)?.[1]);
      if (!title) throw error(503, 'Collins returned an incomplete book series.');
      const grades = listedGrades(response.data);
      let children = links(response.data, 'books').map((book) => {
        const bookGrade = book.title.match(/(?:^|\s)(1[0-2]|[1-9])\s*$/)?.[1];
        return normalize(book, { series: false, grades: bookGrade ? [`Class ${bookGrade}`] : [] });
      });
      if (grade) children = children.filter((book) => book.grades.includes(`Class ${grade}`));
      return { item: normalize({ id, title, sourceUrl: `${ORIGIN}/books_series/${match[1]}/` }, { grades }), children, fetchedAt: new Date(response.at).toISOString(), stale: response.stale, source: 'Collins', note: 'Public book information only. Full e-books, sample registration, lessons and school access are managed by Collins. Confirm your prescribed series and edition with your school.' };
    },
  };
}
