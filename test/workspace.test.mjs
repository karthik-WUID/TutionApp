import { after, before, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createApp } from '../server/app.mjs';
import { languages } from '../server/languages.mjs';
import { localDate } from '../server/productivity.mjs';
import { lessons } from '../server/curriculum.mjs';

const ahead = (n) => new Date(Date.now() + n * 86400000).toISOString();
const taskBody = { userId: 'aanya', title: 'Investigate plant growth', subject: 'Projects', kind: 'project', instructions: 'Observe a plant without damaging it.', dueAt: ahead(4), minutes: 45, steps: ['Observe', 'Explain'] };
const entryBody = { userId: 'aanya', kind: 'research', title: 'Plants and light', question: 'How do plants use light?', body: 'Plants use light energy to make food through photosynthesis.', conclusion: 'Light supplies energy for photosynthesis.', sources: [{ title: 'Photosynthesis', url: 'https://en.wikipedia.org/wiki/Photosynthesis', note: 'Explains conversion of light energy.' }], checklist: ['I checked who published each source'], status: 'completed' };

describe('Homework, timetable, languages, and skills', () => {
  let app, server, origin;
  before(async () => { app = createApp(); server = app.listen(0, '127.0.0.1'); await new Promise((r) => server.once('listening', r)); origin = `http://127.0.0.1:${server.address().port}/api`; });
  after(async () => { server.closeAllConnections(); await new Promise((r) => server.close(r)); app.locals.store.db.close(); });
  async function request(path, body, method = 'POST') { const res = await fetch(`${origin}${path}`, body === undefined ? {} : { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }); return { status: res.status, body: await res.json() }; }
  const get = () => request('/workspace?userId=aanya');
  let taskId, entryId;
  it('seeds starter assignments once and isolates student portfolios', async () => {
    assert.equal((await request('/workspace')).status, 400);
    const first = (await get()).body, second = (await get()).body;
    assert.equal(first.tasks.length, 2); assert.deepEqual(first.tasks.map((t) => t.id), second.tasks.map((t) => t.id));
    assert.equal(first.timezone, 'Asia/Kolkata'); assert.equal(first.languages.length, 8);
    assert.equal((await request('/workspace?userId=aanya&studentId=arjun')).status, 403);
    assert.equal((await request('/workspace?userId=tutor&studentId=arjun')).status, 200);
  });
  it('tracks project drafts, enforces milestones, and preserves tutor feedback', async () => {
    const created = await request('/workspace/tasks', taskBody); assert.equal(created.status, 200);
    taskId = created.body.tasks.find((t) => t.title === taskBody.title).id;
    assert.equal((await request(`/workspace/tasks/${taskId}`, { userId: 'arjun', work: 'My notes', completedSteps: [], status: 'in_progress' }, 'PATCH')).status, 403);
    assert.equal((await request(`/workspace/tasks/${taskId}`, { userId: 'aanya', work: 'I recorded my observations.', completedSteps: ['Observe'], status: 'submitted' }, 'PATCH')).status, 400);
    const draft = await request(`/workspace/tasks/${taskId}`, { userId: 'aanya', work: 'I recorded my observations.', completedSteps: ['Observe'], status: 'in_progress' }, 'PATCH');
    assert.equal(draft.body.tasks.find((t) => t.id === taskId).status, 'in_progress');
    assert.equal((await request(`/workspace/tasks/${taskId}/review`, { userId: 'tutor', studentId: 'aanya', feedback: 'Good observation.' })).status, 400);
    assert.equal((await request(`/workspace/tasks/${taskId}`, { userId: 'aanya', work: 'I recorded and explained my observations.', completedSteps: ['Observe', 'Explain'], status: 'submitted' }, 'PATCH')).status, 200);
    assert.equal((await request(`/workspace/tasks/${taskId}/review`, { userId: 'aanya', feedback: 'Self review' })).status, 403);
    const review = await request(`/workspace/tasks/${taskId}/review`, { userId: 'tutor', studentId: 'aanya', feedback: 'Clear explanation. Add a labelled drawing next.' });
    assert.equal(review.body.tasks.find((t) => t.id === taskId).status, 'reviewed');
    assert.match(review.body.tasks.find((t) => t.id === taskId).feedback, /drawing/);
  });
  it('links assignment tracking to the actual lesson homework state', async () => {
    const task = (await get()).body.tasks.find((t) => t.lesson_id), lesson = lessons.find((l) => l.id === task.lesson_id);
    assert.equal((await request(`/workspace/tasks/${task.id}`, { userId: 'aanya', work: 'Skip lesson questions', completedSteps: [], status: 'submitted' }, 'PATCH')).status, 400);
    await request(`/lessons/${lesson.id}/homework`, { userId: 'aanya', answers: Object.fromEntries(lesson.homework.map((q) => [q.id, 'My written answer.'])), status: 'submitted' });
    assert.equal((await get()).body.tasks.find((t) => t.id === task.id).status, 'submitted');
    await request(`/lessons/${lesson.id}/homework/review`, { userId: 'tutor', studentId: 'aanya', feedback: 'Well written.' }, 'PATCH');
    assert.equal((await get()).body.tasks.find((t) => t.id === task.id).feedback, 'Well written.');
    await request('/learning/preferences', { userId: 'aanya', grade: 1, board: 'CBSE' });
    assert.ok((await request(`/learning?userId=aanya&lessonId=${lesson.id}`)).body.lessons.some((l) => l.id === lesson.id));
    await request('/learning/preferences', { userId: 'aanya', grade: 10, board: 'CBSE' });
  });
  it('lets tutors assign work and validates deadlines and project steps', async () => {
    assert.equal((await request('/workspace/tasks', { ...taskBody, userId: 'tutor', studentId: 'riya', title: 'Tutor assignment' })).status, 200);
    assert.equal((await request('/workspace/tasks', { ...taskBody, studentId: 'arjun' })).status, 403);
    assert.equal((await request('/workspace/tasks', { ...taskBody, dueAt: 'tomorrow' })).status, 400);
    assert.equal((await request('/workspace/tasks', { ...taskBody, minutes: 0 })).status, 400);
    assert.equal((await request('/workspace/tasks', { ...taskBody, steps: ['Repeat', 'Repeat'] })).status, 400);
  });
  it('checks all eight reading passages on the server and saves independent language drafts', async () => {
    const publicCourses = (await get()).body.languages;
    assert.deepEqual(publicCourses.map((l) => l.name), ['English', 'Hindi', 'Tamil', 'Malayalam', 'French', 'Spanish', 'Japanese', 'Mandarin Chinese']);
    assert.ok(publicCourses.every((l) => l.questions.every((q) => !('answer' in q) && !('explanation' in q))));
    for (const l of languages) {
      const result = await request(`/workspace/languages/${l.id}/reading`, { userId: 'aanya', answers: l.questions.map((q) => q.answer) });
      assert.equal(result.body.practice[l.id].reading.score, l.questions.length);
      const saved = await request(`/workspace/languages/${l.id}/practice`, { userId: 'aanya', writing: `My ${l.name} introduction.`, speaking: 'I practised with my tutor.', confidence: 4 });
      assert.equal(saved.body.practice[l.id].writing, `My ${l.name} introduction.`);
      assert.equal(saved.body.practice[l.id].reading.score, l.questions.length);
    }
    assert.equal(Object.keys((await get()).body.practice).length, 8);
    assert.deepEqual((await request('/workspace?userId=arjun')).body.practice, {});
    assert.equal((await request('/workspace/languages/tamil/reading', { userId: 'aanya', answers: [1, 2] })).body.practice.tamil.reading.score, 0);
    assert.equal((await request('/workspace/languages/tamil/reading', { userId: 'aanya', answers: [0] })).status, 400);
    assert.equal((await request('/workspace/languages/tamil/practice', { userId: 'aanya', writing: '', speaking: '', confidence: 6 })).status, 400);
    assert.equal((await request('/workspace/languages/tamil/practice', { userId: 'tutor', studentId: 'aanya', writing: 'Pretend practice', speaking: '', confidence: 3 })).status, 403);
  });
  it('saves research with credited sources and tutor feedback without accepting unsafe links', async () => {
    for (const url of ['javascript:alert(1)', 'http://example.com', 'https://name:password@example.com']) assert.equal((await request('/workspace/entries', { ...entryBody, sources: [{ title: 'Source', url, note: '' }] })).status, 400);
    assert.equal((await request('/workspace/entries', { ...entryBody, sources: [] })).status, 400);
    const created = await request('/workspace/entries', entryBody); assert.equal(created.status, 200); entryId = created.body.entries[0].id;
    assert.equal((await request('/workspace/entries', { ...entryBody, userId: 'arjun', id: entryId })).status, 403);
    assert.equal((await request(`/workspace/entries/${entryId}/review`, { userId: 'tutor', studentId: 'aanya', feedback: 'Compare this with a second source.' })).status, 200);
    assert.equal((await get()).body.entries[0].feedback, 'Compare this with a second source.');
    for (const kind of ['writing', 'speaking', 'project']) assert.equal((await request('/workspace/entries', { ...entryBody, title: `${kind} practice`, kind, sources: [], checklist: [] })).status, 200);
    assert.equal((await get()).body.entries.length, 4);
  });
  it('validates subject plans, study days, and windows within the day', async () => {
    const s = (await get()).body.settings;
    for (const settings of [{ ...s, weekdays: [] }, { ...s, weights: [] }, { ...s, startTime: '25:00' }, { ...s, startTime: '23:59' }, { ...s, dailyMinutes: 5 }, { ...s, weekdays: [1, 1] }]) assert.equal((await request('/workspace/settings', { userId: 'aanya', settings })).status, 400);
    assert.equal((await request('/workspace/generate', { userId: 'aanya', from: '2026-02-30' })).status, 400);
  });
  it('prevents manual study blocks from overlapping booked sessions or each other', async () => {
    await request('/sessions/session-1/booking', { userId: 'aanya', booked: true });
    const session = (await get()).body.sessions[0];
    const b = { userId: 'aanya', title: 'Blocked practice', subject: 'Mathematics', startsAt: session.starts_at, minutes: 25 };
    assert.equal((await request('/workspace/blocks', b)).status, 409);
    b.startsAt = ahead(14);
    const first = await request('/workspace/blocks', b); assert.equal(first.status, 200);
    assert.equal((await request('/workspace/blocks', b)).status, 409);
    const id = first.body.blocks.find((block) => block.title === b.title).id;
    assert.equal((await request(`/workspace/blocks/${id}`, { userId: 'arjun', status: 'completed' }, 'PATCH')).status, 403);
    assert.equal((await request(`/workspace/blocks/${id}`, { userId: 'aanya', status: 'completed' }, 'PATCH')).status, 200);
    assert.equal((await request(`/workspace/blocks/${id}`, { userId: 'aanya' }, 'DELETE')).status, 200);
    const other = (await request('/bootstrap?userId=riya')).body.sessions[1];
    await request('/workspace/blocks', { userId: 'riya', title: 'Already planned', subject: 'Physics', startsAt: other.starts_at, minutes: 25 });
    assert.equal((await request(`/sessions/${other.id}/booking`, { userId: 'riya', booked: true })).status, 409);
  });
  it('builds weighted schedules and retains manual and completed blocks on rebuild', async () => {
    const settings = { dailyMinutes: 60, startTime: '18:00', blockMinutes: 25, weekdays: [0, 1, 2, 3, 4, 5, 6], weights: [{ subject: 'Mathematics', weight: 5 }, { subject: 'Physics', weight: 1 }] };
    await request('/workspace/settings', { userId: 'aanya', settings });
    const from = localDate(new Date(ahead(20))), start = new Date(`${from}T18:00:00+05:30`).toISOString();
    const manual = await request('/workspace/blocks', { userId: 'aanya', title: 'Keep this manual block', subject: 'Physics', startsAt: start, minutes: 25 });
    const manualId = manual.body.blocks.find((b) => b.title === 'Keep this manual block').id;
    const first = (await request('/workspace/generate', { userId: 'aanya', from })).body;
    assert.ok(first.generated > 0);
    const generated = first.blocks.filter((b) => b.source === 'generated');
    assert.ok(generated.filter((b) => b.subject === 'Mathematics').length > generated.filter((b) => b.subject === 'Physics').length);
    for (let i = 1; i < first.blocks.length; i++) assert.ok(Date.parse(first.blocks[i].starts_at) >= Date.parse(first.blocks[i - 1].starts_at) + first.blocks[i - 1].minutes * 60000);
    const complete = generated[0]; await request(`/workspace/blocks/${complete.id}`, { userId: 'aanya', status: 'completed' }, 'PATCH');
    const second = (await request('/workspace/generate', { userId: 'aanya', from })).body;
    assert.ok(second.blocks.some((b) => b.id === manualId)); assert.ok(second.blocks.some((b) => b.id === complete.id && b.status === 'completed'));
    for (const b of second.blocks) { const local = new Date(Date.parse(b.starts_at) + 330 * 60000); const minutes = local.getUTCHours() * 60 + local.getUTCMinutes(); assert.ok(minutes >= 18 * 60 && minutes + b.minutes <= 19 * 60); }
  });
});

it('retains assignments, schedules, language practice, and research after a server restart', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'smart-tutor-workspace-')), path = join(dir, 'persist.sqlite');
  let app = createApp({ databasePath: path }), server = app.listen(0, '127.0.0.1');
  await new Promise((r) => server.once('listening', r));
  const origin = `http://127.0.0.1:${server.address().port}/api/workspace`;
  const post = (route, body) => fetch(`${origin}${route}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  try {
    await post('/tasks', taskBody); await post('/entries', entryBody);
    await post('/languages/tamil/practice', { userId: 'aanya', writing: 'வணக்கம். என் பெயர் மீனா.', speaking: 'Practised a greeting.', confidence: 4 });
    await post('/blocks', { userId: 'aanya', title: 'Persistent study', subject: 'Tamil', minutes: 20, startsAt: ahead(30) });
    server.closeAllConnections(); await new Promise((r) => server.close(r)); app.locals.store.db.close();
    app = createApp({ databasePath: path }); server = app.listen(0, '127.0.0.1'); await new Promise((r) => server.once('listening', r));
    const data = await (await fetch(`http://127.0.0.1:${server.address().port}/api/workspace?userId=aanya`)).json();
    assert.equal(data.tasks.length, 3); assert.equal(data.entries[0].title, entryBody.title); assert.match(data.practice.tamil.writing, /வணக்கம்/); assert.equal(data.blocks[0].title, 'Persistent study');
  } finally { server.closeAllConnections(); await new Promise((r) => server.close(r)); app.locals.store.db.close(); rmSync(dir, { recursive: true }); }
});
