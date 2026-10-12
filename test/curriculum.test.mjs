import { after, before, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from '../server/app.mjs';
import { createCurriculumProvider, curriculumBoards, normalizeResource, subjectGroups } from '../server/curriculum-directory.mjs';

const resource = (overrides = {}) => ({ identifier: 'do_31310347524809523211409', name: 'Our textbook', status: 'Live', visibility: 'Default', board: 'CBSE', gradeLevel: ['Class 10'], medium: ['English'], subject: ['Mathematics'], contentType: 'TextBook', primaryCategory: 'Digital Textbook', mimeType: 'application/vnd.ekstep.content-collection', license: 'CC BY 4.0', ...overrides });
const response = (result) => new Response(JSON.stringify({ params: { status: 'successful' }, result }), { headers: { 'Content-Type': 'application/json' } });
const filters = { board: curriculumBoards[0], grade: 10, medium: 'English', kind: 'textbooks', subject: '', query: '', offset: 0 };

describe('DIKSHA curriculum provider', () => {
  it('sends the selected board/class/medium and textbook or lesson filters to the public endpoint', async () => {
    const calls = [];
    const provider = createCurriculumProvider({ fetchImpl: async (url, options) => { calls.push({ url, body: JSON.parse(options.body) }); return response({ content: [], count: 0, facets: [] }); } });
    await provider.directory(filters);
    await provider.directory({ ...filters, board: curriculumBoards[1], medium: 'Tamil', kind: 'lessons', subject: 'Science', query: 'light', offset: 20 });
    assert.equal(calls[0].url, 'https://diksha.gov.in/api/content/v1/search');
    assert.deepEqual(calls[0].body.request.filters.contentType, ['TextBook']);
    assert.deepEqual(calls[1].body.request.filters, { board: ['State (Tamil Nadu)'], gradeLevel: ['Class 10'], medium: ['Tamil'], status: ['Live'], visibility: ['Default', 'Parent'], contentType: ['Resource'], subject: ['Science'] });
    assert.equal(calls[1].body.request.query, 'light');
    assert.equal(calls[1].body.request.offset, 20);
    assert.equal(calls[1].body.request.limit, 20);
  });
  it('keeps scoped public records and strips unknown media URLs and markup', async () => {
    const provider = createCurriculumProvider({ fetchImpl: async () => response({ count: 4, content: [resource(), resource({ identifier: 'do_3128933508236902401246', board: 'State (Tamil Nadu)' }), resource({ identifier: 'do_3128933508236902401247', status: 'Draft' }), resource({ identifier: 'do_3128933508236902401248', visibility: 'Private' })] }) });
    const result = await provider.directory(filters);
    assert.equal(result.items.length, 1);
    const item = normalizeResource(resource({ contentType: 'Resource', mimeType: 'video/mp4', name: '<b>Light</b>', artifactUrl: 'https://evil.example/movie.mp4' }));
    assert.equal(item.title, 'Light'); assert.equal(item.mediaUrl, null);
    assert.equal(normalizeResource(resource({ identifier: '../private' })), null);
    assert.equal(normalizeResource(resource({ mimeType: 'application/pdf', artifactUrl: 'https://obj.diksha.gov.in/book.pdf' })).mediaUrl, 'https://obj.diksha.gov.in/book.pdf');
  });
  it('searches subject aliases without mixing unrelated subjects', async () => {
    for (const [subject, tagged] of [['Social Studies', 'Political Science/Civics'], ['Tamil', 'தமிழ்'], ['Computer Science', 'Informatics Practices'], ['Value Education', 'Moral Science']]) {
      let sent;
      const provider = createCurriculumProvider({ fetchImpl: async (_url, options) => { sent = JSON.parse(options.body).request.filters.subject; return response({ count: 2, content: [resource({ subject: [tagged] }), resource({ identifier: 'do_999999999', subject: ['Unrelated'] })] }); } });
      const result = await provider.directory({ ...filters, subject });
      assert.deepEqual(sent, subjectGroups.find((group) => group.id === subject).aliases);
      assert.equal(result.items.length, 1); assert.deepEqual(result.items[0].subjects, [tagged]);
    }
  });
  it('coalesces requests and returns dated stale results during a provider outage', async () => {
    let clock = 0, calls = 0, unavailable = false;
    const provider = createCurriculumProvider({ now: () => clock, fetchImpl: async () => { calls++; await new Promise((r) => setTimeout(r, 5)); return unavailable ? new Response('', { status: 503 }) : response({ count: 1, content: [resource()] }); } });
    const [a, b] = await Promise.all([provider.directory(filters), provider.directory(filters)]);
    assert.equal(calls, 1); assert.equal(a.fetchedAt, b.fetchedAt);
    assert.equal((await provider.directory(filters)).cached, true); assert.equal(calls, 1);
    clock = 300_001; unavailable = true;
    const stale = await provider.directory(filters);
    assert.equal(stale.stale, true); assert.equal(stale.fetchedAt, new Date(0).toISOString());
    clock = 86_400_001;
    await assert.rejects(provider.directory(filters), (e) => e.status === 503);
  });
  it('reports invalid JSON and authorization failures without inventing results', async () => {
    for (const makeResponse of [() => new Response('<html>unavailable</html>'), () => new Response('', { status: 401 }), () => response({ count: '20', content: [] })]) {
      const provider = createCurriculumProvider({ fetchImpl: async () => makeResponse() });
      await assert.rejects(provider.directory(filters), (e) => e.status === 503);
    }
  });
  it('recognises the publisher’s empty result without a content array', async () => {
    const provider = createCurriculumProvider({ fetchImpl: async () => response({ count: 0, facets: [] }) });
    const result = await provider.directory({ ...filters, subject: 'Value Education' });
    assert.equal(result.total, 0); assert.deepEqual(result.items, []);
  });
  it('reads public textbook chapters and rejects invalid or unpublished resource IDs', async () => {
    let calls = 0, status = 'Live';
    const provider = createCurriculumProvider({ fetchImpl: async () => { calls++; return response({ content: resource({ status, children: [resource({ identifier: 'do_3128933508236902401246', name: 'Chapter 1' }), resource({ identifier: 'do_3128933508236902401247', status: 'Draft' })] }) }); } });
    await assert.rejects(provider.resource('../../secret'), (e) => e.status === 400); assert.equal(calls, 0);
    const result = await provider.resource('do_31310347524809523211409'); assert.equal(result.children.length, 1); assert.equal(result.children[0].title, 'Chapter 1');
    status = 'Draft';
    const hidden = createCurriculumProvider({ fetchImpl: async () => response({ content: resource({ status }) }) });
    await assert.rejects(hidden.resource('do_31310347524809523211409'), (e) => e.status === 404);
  });
  it('navigates nested textbook units through the live hierarchy and verifies leaf content', async () => {
    const root = resource(), unitId = 'do_31307360983869849612178', pdfId = 'do_3129911299744563201237';
    const pdf = resource({ identifier: pdfId, name: 'Resources and Development', contentType: 'eTextBook', mimeType: 'application/pdf', artifactUrl: 'https://obj.diksha.gov.in/chapter.pdf' });
    const unit = resource({ identifier: unitId, name: 'Chapter 1', contentType: 'TextBookUnit', visibility: 'Parent', children: [pdf] });
    const calls = [];
    const provider = createCurriculumProvider({ fetchImpl: async (url) => {
      calls.push(url);
      return response({ content: url.includes('/hierarchy/') ? { ...root, children: [unit] } : url.endsWith(pdfId) ? pdf : root });
    } });
    assert.equal((await provider.resource(root.identifier)).children[0].id, unitId);
    const section = await provider.resource(unitId, root.identifier);
    assert.equal(section.item.id, unitId); assert.equal(section.children[0].id, pdfId);
    assert.equal((await provider.resource(pdfId, root.identifier)).item.mediaUrl, pdf.artifactUrl);
    assert.equal(calls.length, 3); assert.ok(calls[1].includes('/course/v1/hierarchy/'));
    await assert.rejects(provider.resource('do_999999999', root.identifier), (e) => e.status === 404);
    await assert.rejects(provider.resource(unitId, '../private'), (e) => e.status === 400);
    const withdrawn = createCurriculumProvider({ fetchImpl: async (url) => response({ content: url.includes('/hierarchy/') ? { ...root, children: [unit] } : url.endsWith(pdfId) ? { ...pdf, status: 'Retired' } : root }) });
    await assert.rejects(withdrawn.resource(pdfId, root.identifier), (e) => e.status === 404);
  });
});

describe('Curriculum API routes', () => {
  let app, server, origin, calls = 0;
  before(async () => {
    const provider = createCurriculumProvider({ fetchImpl: async () => { calls++; return response({ count: 1, content: [resource()] }); } });
    app = createApp({ curriculumProvider: provider }); server = app.listen(0, '127.0.0.1');
    await new Promise((r) => server.once('listening', r)); origin = `http://127.0.0.1:${server.address().port}`;
  });
  after(async () => { server.closeAllConnections(); await new Promise((r) => server.close(r)); app.locals.store.db.close(); });
  const request = async (path) => { const r = await fetch(origin + path); return { status: r.status, body: await r.json() }; };
  it('exposes both boards, Collins, all twelve classes and the four featured subjects', async () => {
    const { body, status } = await request('/api/curriculum?userId=aanya');
    assert.equal(status, 200); assert.equal(body.boards.length, 3); assert.equal(body.grades.length, 12);
    assert.deepEqual(body.subjectGroups.map((group) => group.id), ['Social Studies', 'Tamil', 'Computer Science', 'Value Education']);
    assert.equal(body.boards[2].source, 'Collins');
    assert.equal((await request('/api/curriculum?userId=unknown')).status, 400);
  });
  it('validates scope and pagination before calling the provider', async () => {
    const query = new URLSearchParams({ userId: 'aanya', board: 'CBSE', grade: '10', medium: 'English', kind: 'textbooks' });
    const before = calls;
    for (const [key, value] of [['grade', '13'], ['board', 'Unknown'], ['medium', 'Tamil'], ['kind', 'private'], ['offset', '-20'], ['q', 'x'.repeat(161)]]) {
      const bad = new URLSearchParams(query); bad.set(key, value);
      assert.equal((await request(`/api/curriculum/directory?${bad}`)).status, 400);
    }
    assert.equal(calls, before);
    assert.equal((await request('/api/curriculum/resources/do_123456?userId=aanya&rootId=a&rootId=b')).status, 400);
    const good = await request(`/api/curriculum/directory?${query}`);
    assert.equal(good.status, 200); assert.equal(good.body.items.length, 1);
  });
});
