// Public DIKSHA content API; all requests and response validation stay on the server.
import { createCollinsProvider } from './collins-directory.mjs';
const API_ROOT = 'https://diksha.gov.in/api';
const ID = /^do_\d{5,40}$/;
const PAGE_SIZE = 20;
export const curriculumBoards = [
  { id: 'CBSE', label: 'CBSE', providerBoard: 'CBSE', mediums: ['English', 'Hindi', 'Urdu'], syllabusUrl: 'https://cbseacademic.nic.in/curriculum_2027.html', textbookUrl: 'https://ncert.nic.in/textbook.php?ln=en', sourceUrl: 'https://diksha.gov.in/explore', syllabusNote: 'CBSE publishes the 2026–27 syllabus for Classes 9–12. For other classes, use the NCERT textbook directory and your school’s assigned books.' },
  { id: 'Tamil Nadu State Board', label: 'Tamil Nadu State Board', providerBoard: 'State (Tamil Nadu)', mediums: ['English', 'Tamil'], syllabusUrl: 'https://scert.tnschools.gov.in/', textbookUrl: 'https://diksha.gov.in/tn/', sourceUrl: 'https://diksha.gov.in/tn/', syllabusNote: 'Samacheer Kalvi resources published on Tamil Nadu DIKSHA. Confirm the textbook edition and assigned portions with your school.' },
];
curriculumBoards.forEach((board) => { board.source = 'DIKSHA'; board.kinds = ['textbooks', 'lessons']; });
curriculumBoards.push({ id: 'Matriculation / Collins', label: 'Collins books', providerBoard: '', source: 'Collins', kinds: ['textbooks'], mediums: ['English'], syllabusUrl: 'https://collins.in/school-catalogue/', textbookUrl: 'https://collins.in/books/', sourceUrl: 'https://collins.in/books/', syllabusNote: 'Collins is a publisher. Browse its public book series by school stage, then confirm the exact class and edition prescribed by your school. Full digital books and lessons use Collins school access.', extraLinks: [{ label: 'Collins DigiSuite', url: 'https://collins.in/digisuite/' }, { label: 'Collins Social Science (Classes 6–8)', url: 'https://collins.in/books_series/social-science/' }] });
export const subjectGroups = [
  { id: 'Social Studies', label: 'Social Studies', aliases: ['Social Studies', 'Social Science', 'History', 'Geography', 'Civics', 'Political Science', 'Political Science/Civics', 'Economics'] },
  { id: 'Tamil', label: 'Tamil', aliases: ['Tamil', 'Tamil Language', 'தமிழ்'] },
  { id: 'Computer Science', label: 'Computer Science', aliases: ['Computer Science', 'Computer Applications', 'Information Technology', 'Informatics Practices', 'ICT', 'Computers', 'Standard 11 Computer Science', 'Standard 12 Computer Science'] },
  { id: 'Value Education', label: 'Value Education', aliases: ['Value Education', 'Moral Science', 'Ethics', 'Life Skills', 'Values', 'Value Education and Life Skills', 'Social and Emotional Learning'] },
];
const subjectAliases = (subject) => subjectGroups.find((group) => group.id.toLowerCase() === subject.toLowerCase())?.aliases || [subject];
const strings = (value) => (Array.isArray(value) ? value : [value]).filter((x) => typeof x === 'string').slice(0, 30);
const cleanText = (value, max = 400) => typeof value === 'string' ? value.replace(/<[^>]*>/g, '').trim().slice(0, max) : '';
const problem = (status, message) => Object.assign(new Error(message), { status });
const isPublic = (item) => item?.status === 'Live' && ['Default', 'Parent'].includes(item.visibility || 'Default');
function mediaUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && !url.username && !url.password && ['obj.diksha.gov.in', 'ntpstorageall.blob.core.windows.net', 'ncert.nic.in', 'www.ncert.nic.in'].includes(url.hostname) ? url.href : null;
  } catch { return null; }
}
export function normalizeResource(item) {
  if (!item || !ID.test(item.identifier) || !cleanText(item.name)) return null;
  const isCollection = item.mimeType === 'application/vnd.ekstep.content-collection' || ['TextBook', 'TextBookUnit', 'Collection'].includes(item.contentType);
  return {
    id: item.identifier, title: cleanText(item.name, 240), description: cleanText(item.description),
    board: strings(item.board), grades: strings(item.gradeLevel), mediums: strings(item.medium), subjects: strings(item.subject),
    category: cleanText(item.primaryCategory || item.contentType, 80),
    format: isCollection ? 'collection' : item.mimeType === 'application/pdf' ? 'pdf' : item.mimeType === 'video/mp4' ? 'video' : 'interactive',
    mediaUrl: ['application/pdf', 'video/mp4'].includes(item.mimeType) ? mediaUrl(item.artifactUrl) : null,
    sourceUrl: isCollection ? `https://diksha.gov.in/play/collection/${item.identifier}?contentType=TextBook` : `https://diksha.gov.in/resources/play/content/${item.identifier}`,
    creator: cleanText(item.creator || item.author || item.copyright, 150), license: cleanText(item.license, 80),
  };
}
export function createCurriculumProvider({ fetchImpl = fetch, now = Date.now, timeoutMs = 12000 } = {}) {
  const cache = new Map(), pending = new Map();
  async function request(path, body) {
    const key = JSON.stringify([path, body]);
    const previous = cache.get(key);
    if (previous && now() - previous.at < 300_000) return { data: previous.data, fetchedAt: new Date(previous.at).toISOString(), cached: true, stale: false };
    if (pending.has(key)) return pending.get(key);
    const job = (async () => {
      try {
        const response = await fetchImpl(`${API_ROOT}/${path}`, {
          method: body ? 'POST' : 'GET', headers: { Accept: 'application/json', ...(body ? { 'Content-Type': 'application/json' } : {}) },
          ...(body ? { body: JSON.stringify(body) } : {}), signal: AbortSignal.timeout(timeoutMs), redirect: 'error',
        });
        if (!response.ok) throw problem(response.status === 404 ? 404 : 503, response.status === 404 ? 'This DIKSHA resource is no longer available.' : 'DIKSHA is temporarily unavailable. Please try again or open the official directory below.');
        // Bound both declared and streamed size, including collection responses.
        if (Number(response.headers.get('content-length')) > 4_000_000) throw problem(503, 'This resource is too large to load here. Open it on DIKSHA.');
        const reader = response.body.getReader();
        let size = 0, chunks = [];
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            size += value.byteLength;
            if (size > 4_000_000) { await reader.cancel(); throw problem(503, 'This resource is too large to load here. Open it on DIKSHA.'); }
            chunks.push(value);
          }
        } finally { reader.releaseLock(); }
        const data = JSON.parse(Buffer.concat(chunks).toString('utf8'));
        if (data.params?.status !== 'successful' || !data.result) throw problem(503, 'DIKSHA returned an incomplete response. Please try again.');
        const at = now();
        if (cache.size >= 120) cache.delete(cache.keys().next().value);
        cache.set(key, { data: data.result, at });
        return { data: data.result, fetchedAt: new Date(at).toISOString(), cached: false, stale: false };
      } catch (error) {
        if (error.status !== 404 && previous && now() - previous.at < 86_400_000) return { data: previous.data, fetchedAt: new Date(previous.at).toISOString(), cached: true, stale: true };
        if (error.status) throw error;
        throw problem(503, 'DIKSHA could not be reached. Please try again or open the official directory below.');
      }
    })();
    pending.set(key, job);
    try { return await job; } finally { pending.delete(key); }
  }
  return {
    async directory({ board, grade, medium, subject, kind, query, offset }) {
      const filters = { board: [board.providerBoard], gradeLevel: [`Class ${grade}`], medium: [medium], status: ['Live'], visibility: ['Default', 'Parent'], contentType: [kind === 'textbooks' ? 'TextBook' : 'Resource'] };
      if (subject) filters.subject = subjectAliases(subject);
      const response = await request('content/v1/search', { request: { filters, ...(query ? { query } : {}), limit: PAGE_SIZE, offset, facets: ['subject'] } });
      const content = response.data.content ?? (response.data.count === 0 ? [] : null);
      if (!Array.isArray(content) || !Number.isSafeInteger(response.data.count) || response.data.count < 0) throw problem(503, 'DIKSHA returned an incomplete directory. Please try again.');
      const matches = (value, selected) => strings(value).some((x) => x.toLowerCase() === selected.toLowerCase());
      const items = content.filter((x) => isPublic(x) && matches(x.board, board.providerBoard) && matches(x.gradeLevel, `Class ${grade}`) && matches(x.medium, medium) && (!subject || subjectAliases(subject).some((alias) => matches(x.subject, alias)))).slice(0, PAGE_SIZE).map(normalizeResource).filter(Boolean);
      const subjects = (Array.isArray(response.data.facets) ? response.data.facets : []).find((f) => f?.name === 'subject')?.values;
      return { items, total: response.data.count, offset, limit: PAGE_SIZE, subjects: (Array.isArray(subjects) ? subjects : []).map((s) => cleanText(s?.name, 100)).filter(Boolean).slice(0, 80), fetchedAt: response.fetchedAt, cached: response.cached, stale: response.stale, source: 'DIKSHA' };
    },
    async resource(id, rootId = id) {
      if (!ID.test(id) || !ID.test(rootId)) throw problem(400, 'Choose a valid DIKSHA resource.');
      const responses = [];
      const read = async (path, expectedId) => {
        const result = await request(path);
        const content = result.data.content;
        if (!isPublic(content) || content.identifier !== expectedId) throw problem(404, 'This public DIKSHA resource is no longer available.');
        responses.push(result);
        return content;
      };
      let content = await read(`content/v1/read/${rootId}`, rootId);
      if (normalizeResource(content)?.format === 'collection') {
        // Live textbooks use the public course hierarchy endpoint. Unit IDs are
        // resolved inside their book: the content read endpoint may alias a unit
        // to its parent and omit all chapter children.
        try { content = { ...content, ...await read(`course/v1/hierarchy/${rootId}`, rootId) }; }
        catch (error) { if (error.status !== 404 || !Array.isArray(content.children)) throw error; }
      }
      if (id !== rootId) {
        const find = (node, depth = 0) => {
          if (depth > 30 || !isPublic(node)) return null;
          if (node.identifier === id) return node;
          for (const child of Array.isArray(node.children) ? node.children : []) {
            const match = find(child, depth + 1);
            if (match) return match;
          }
          return null;
        };
        content = find(content);
        if (!content) throw problem(404, 'This chapter is no longer available in the selected textbook.');
        if (normalizeResource(content)?.format !== 'collection') content = await read(`content/v1/read/${id}`, id);
      }
      const item = normalizeResource(content);
      if (!item) throw problem(503, 'DIKSHA returned an incomplete resource. Please try again.');
      if (id !== rootId) item.sourceUrl = `https://diksha.gov.in/play/collection/${rootId}?contentType=TextBook&contentId=${id}`;
      const children = (Array.isArray(content.children) ? content.children : []).filter(isPublic).map(normalizeResource).filter(Boolean);
      return { item, children, fetchedAt: responses.map((r) => r.fetchedAt).sort()[0], stale: responses.some((r) => r.stale), source: 'DIKSHA' };
    },
  };
}
export function registerCurriculumDirectory(app, { store, provider = createCurriculumProvider(), collinsProvider = createCollinsProvider() }) {
  const viewer = (req) => { if (typeof req.query.userId !== 'string' || !store.user(req.query.userId)) throw problem(400, 'Please select a classroom profile.'); };
  app.get('/api/curriculum', (req, res) => {
    viewer(req);
    res.json({ boards: curriculumBoards, grades: Array.from({ length: 12 }, (_, i) => i + 1), subjectGroups, kinds: ['textbooks', 'lessons'], source: 'DIKSHA and Collins', note: 'Live publisher resources. Availability and editions vary by class, subject and medium.' });
  });
  app.get('/api/curriculum/directory', async (req, res) => {
    viewer(req);
    const board = curriculumBoards.find((b) => b.id === req.query.board);
    const grade = Number(req.query.grade), medium = req.query.medium, kind = req.query.kind;
    const offset = req.query.offset === undefined ? 0 : Number(req.query.offset);
    const query = req.query.q ?? '', subject = req.query.subject ?? '';
    if (!board || !Number.isInteger(grade) || grade < 1 || grade > 12 || !board.mediums.includes(medium) || !['textbooks', 'lessons'].includes(kind)) throw problem(400, 'Choose an available board, class, medium and resource type.');
    if (!Number.isSafeInteger(offset) || offset < 0 || offset > 100_000 || typeof query !== 'string' || query.length > 160 || typeof subject !== 'string' || subject.length > 100) throw problem(400, 'Use a shorter search and a valid page.');
    const selectedProvider = board.source === 'Collins' ? collinsProvider : provider;
    try { res.json(await selectedProvider.directory({ board, grade, medium, kind, offset, query: query.trim(), subject: subject.trim() })); }
    catch (error) { if ([404, 503].includes(error.status)) res.status(error.status).json({ error: error.message }); else throw error; }
  });
  app.get('/api/curriculum/resources/:id', async (req, res) => {
    viewer(req);
    if (req.query.rootId !== undefined && typeof req.query.rootId !== 'string') throw problem(400, 'Choose a valid textbook.');
    const grade = req.query.grade === undefined ? undefined : Number(req.query.grade);
    if (grade !== undefined && (!Number.isInteger(grade) || grade < 1 || grade > 12)) throw problem(400, 'Choose a class between 1 and 12.');
    const selectedProvider = req.params.id.startsWith('collins_') ? collinsProvider : provider;
    try { res.json(await selectedProvider.resource(req.params.id, req.query.rootId, grade)); }
    catch (error) { if ([400, 404, 503].includes(error.status)) res.status(error.status).json({ error: error.message }); else throw error; }
  });
}
