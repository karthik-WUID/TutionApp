import { after, before, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createApp } from '../server/app.mjs';
import { lessons } from '../server/curriculum.mjs';

describe('Smart tutor classroom and learning API', () => {
  let app, server, origin;
  before(async () => {
    app = createApp();
    server = app.listen(0, '127.0.0.1');
    await new Promise((resolve) => server.once('listening', resolve));
    origin = `http://127.0.0.1:${server.address().port}/api`;
  });
  after(async () => { server.closeAllConnections(); await new Promise((resolve) => server.close(resolve)); app.locals.store.db.close(); });
  async function request(path, body, method = 'POST') {
    const response = await fetch(`${origin}${path}`, body === undefined ? {} : { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    return { status: response.status, body: await response.json() };
  }
  let doubtId;
  it('starts a seeded classroom and validates profile selection', async () => {
    assert.equal((await request('/health')).body.status, 'ok');
    const r = await request('/bootstrap?userId=aanya');
    assert.equal(r.body.users.length, 4); assert.equal(r.body.doubts.length, 4); assert.equal(r.body.sessions.length, 3);
    assert.equal((await request('/bootstrap?userId=unknown')).status, 400);
    assert.equal((await request('/unknown')).status, 404);
  });
  it('creates a doubt and saves a peer reply', async () => {
    const r = await request('/doubts', { userId: 'aanya', title: 'How do I check a quadratic root?', body: 'Can I substitute a possible root into the original equation to check it?', subject: 'Mathematics' });
    assert.equal(r.status, 201); doubtId = r.body.id;
    const reply = await request(`/doubts/${doubtId}/replies`, { userId: 'arjun', body: 'Yes. Substitute the number and check whether the expression equals zero.' });
    assert.equal(reply.status, 201); assert.equal(reply.body.replies[0].author.id, 'arjun');
    assert.equal((await request(`/doubts/${doubtId}?userId=riya`)).body.replies.length, 1);
  });
  it('rejects invalid questions and empty replies', async () => {
    assert.equal((await request('/doubts', { userId: 'aanya', title: 'short', body: 'Too short', subject: 'History' })).status, 400);
    assert.equal((await request(`/doubts/${doubtId}/replies`, { userId: 'arjun', body: '   ' })).status, 400);
    assert.equal((await request('/doubts/missing?userId=aanya')).status, 404);
  });
  it('allows resolution by the owner or tutor and isolates bookmarks by profile', async () => {
    assert.equal((await request(`/doubts/${doubtId}`, { userId: 'arjun', status: 'resolved' }, 'PATCH')).status, 403);
    const r = await request(`/doubts/${doubtId}`, { userId: 'tutor', status: 'resolved' }, 'PATCH');
    assert.equal(r.body.status, 'resolved');
    assert.equal((await request(`/doubts/${doubtId}/bookmark`, { userId: 'aanya', saved: true })).body.saved, true);
    assert.equal((await request(`/doubts/${doubtId}?userId=arjun`)).body.saved, false);
    assert.equal((await request(`/doubts/${doubtId}/bookmark`, { userId: 'aanya', saved: false })).body.saved, false);
  });
  it('requires a booking for chat, books idempotently, and saves messages', async () => {
    assert.equal((await request('/sessions/session-2/messages?userId=arjun')).status, 403);
    const first = await request('/sessions/session-2/booking', { userId: 'arjun', booked: true });
    assert.equal(first.body.attendees, 1);
    assert.equal((await request('/sessions/session-2/booking', { userId: 'arjun', booked: true })).body.attendees, 1);
    const message = await request('/sessions/session-2/messages', { userId: 'arjun', body: 'Can we discuss inertia in the next class?' });
    assert.equal(message.status, 201); assert.equal(message.body[0].author.id, 'arjun');
    assert.equal((await request('/sessions/session-2/messages?userId=tutor')).body.length, 1);
    await request('/sessions/session-2/booking', { userId: 'arjun', booked: false });
    assert.equal((await request('/sessions/session-2/messages?userId=arjun')).status, 403);
  });
  it('rejects bookings when the room has reached capacity', async () => {
    const db = app.locals.store.db;
    for (let i = 0; i < 10; i++) {
      db.prepare('INSERT INTO users VALUES (?, ?, ?, ?, ?)').run(`seat-${i}`, 'Capacity fixture', 'student', 'CF', 'blue');
      db.prepare('INSERT INTO bookings VALUES (?, ?)').run(`seat-${i}`, 'session-2');
    }
    assert.equal((await request('/sessions/session-2/booking', { userId: 'riya', booked: true })).status, 409);
  });
  it('offers age-appropriate portions for all 12 classes and all three boards', async () => {
    for (const board of ['CBSE', 'Tamil Nadu State Board', 'Matriculation / Collins']) {
      for (let grade = 1; grade <= 12; grade++) {
        const r = await request('/learning/preferences', { userId: 'aanya', grade, board });
        assert.equal(r.status, 200); assert.equal(r.body.preferences.grade, grade); assert.equal(r.body.preferences.board, board);
        assert.equal(r.body.lessons.length, 4);
        for (const l of r.body.lessons) { assert.ok(l.minGrade <= grade && l.maxGrade >= grade); assert.equal(l.questions.length, 5); assert.equal(l.homework.length, 6); }
      }
    }
    assert.equal((await request('/learning/preferences', { userId: 'aanya', grade: 13, board: 'CBSE' })).status, 400);
    await request('/learning/preferences', { userId: 'aanya', grade: 10, board: 'CBSE' });
  });
  it('keeps answers out of unsolved quizzes and grades all 20 starter tests', async () => {
    const publicData = (await request('/learning?userId=aanya')).body;
    for (const l of publicData.lessons) for (const q of l.questions) { assert.equal(q.answer, undefined); assert.equal(q.explanation, undefined); }
    assert.equal(lessons.length, 20);
    for (const l of lessons) {
      const r = await request(`/lessons/${l.id}/test`, { userId: 'aanya', answers: l.questions.map((q) => q.answer) });
      assert.equal(r.status, 201); assert.equal(r.body.score, 5); assert.equal(r.body.total, 5);
      assert.ok(r.body.results.every((result) => result.correct && result.explanation));
    }
  });
  it('grades incorrect answers and rejects incomplete or invalid attempts', async () => {
    const l = lessons.find((l) => l.id === 'quadratics');
    const r = await request('/lessons/quadratics/test', { userId: 'arjun', answers: l.questions.map((q) => (q.answer + 1) % 4) });
    assert.equal(r.body.score, 0); assert.ok(r.body.results.every((r) => !r.correct));
    assert.equal((await request('/lessons/quadratics/test', { userId: 'arjun', answers: [0] })).status, 400);
    assert.equal((await request('/lessons/quadratics/test', { userId: 'arjun', answers: [-1, 0, 0, 0, 0] })).status, 400);
  });
  it('tracks lesson milestones and rejects arbitrary activity names', async () => {
    const r = await request('/lessons/quadratics/progress', { userId: 'aanya', activity: 'read', complete: true }, 'PATCH');
    assert.equal(r.body.progress.quadratics.read, true); assert.equal(r.body.progress.quadratics.visual, false);
    const v = await request('/lessons/quadratics/progress', { userId: 'aanya', activity: 'visual', complete: true }, 'PATCH');
    assert.equal(v.body.progress.quadratics.visual, true);
    assert.equal((await request('/lessons/quadratics/progress', { userId: 'aanya', activity: 'DROP TABLE users', complete: true }, 'PATCH')).status, 400);
  });
  it('saves drafts, requires complete homework, and allows tutor review', async () => {
    const l = lessons.find((l) => l.id === 'quadratics');
    const draft = await request('/lessons/quadratics/homework', { userId: 'aanya', status: 'draft', answers: { 'q-written': 'Factor into two brackets, then set each factor equal to zero.' } });
    assert.equal(draft.status, 200); assert.equal(draft.body.status, 'draft');
    assert.equal((await request('/lessons/quadratics/homework', { userId: 'aanya', status: 'submitted', answers: {} })).status, 400);
    const answers = Object.fromEntries(l.homework.map((q) => [q.id, 'A complete written answer for this question.']));
    assert.equal((await request('/lessons/quadratics/homework', { userId: 'aanya', status: 'submitted', answers })).body.status, 'submitted');
    assert.equal((await request('/lessons/quadratics/homework/review', { userId: 'arjun', studentId: 'aanya', feedback: 'Try again.' }, 'PATCH')).status, 403);
    const review = await request('/lessons/quadratics/homework/review', { userId: 'tutor', studentId: 'aanya', feedback: 'Good effort. Show the factorisation steps in your next answer.' }, 'PATCH');
    assert.equal(review.body.status, 'reviewed'); assert.ok(review.body.feedback.includes('Good effort'));
    assert.equal((await request('/learning?userId=arjun')).body.homework.quadratics, undefined);
  });
  it('saves voluntary mood and confidence check-ins with validation', async () => {
    const r = await request('/moods', { userId: 'aanya', mood: 'tired', confidence: 2, note: 'A short break would help.' });
    assert.equal(r.status, 201); assert.equal(r.body.mood, 'tired');
    assert.equal((await request('/learning?userId=aanya')).body.moods[0].confidence, 2);
    assert.equal((await request('/moods', { userId: 'aanya', mood: 'tired', confidence: 6 })).status, 400);
    assert.equal((await request('/moods', { userId: 'aanya', mood: 'unknown', confidence: 3 })).status, 400);
  });
  it('maps exact textbook metadata only as a tutor and only within the selected class/board', async () => {
    const body = { grade: 10, board: 'Matriculation / Collins', title: 'Classroom textbook', edition: '2026', chapter: 'Chapter 4 · Quadratics', portions: 'Factorisation and exercise 4.1.' };
    assert.equal((await request('/lessons/quadratics/textbook', { userId: 'aanya', ...body })).status, 403);
    assert.equal((await request('/lessons/quadratics/textbook', { userId: 'tutor', ...body })).status, 200);
    assert.equal((await request('/learning?userId=aanya')).body.mappings.quadratics, undefined);
    await request('/learning/preferences', { userId: 'aanya', grade: 10, board: body.board });
    assert.equal((await request('/learning?userId=aanya')).body.mappings.quadratics.chapter, body.chapter);
  });
  it('broadcasts classroom changes to an event-stream subscriber', async () => {
    const controller = new AbortController();
    const response = await fetch(`${origin}/events`, { signal: controller.signal });
    const reader = response.body.getReader();
    await reader.read();
    await request('/moods', { userId: 'riya', mood: 'focused', confidence: 4 });
    const next = await reader.read();
    assert.ok(new TextDecoder().decode(next.value).includes('"type":"update"'));
    controller.abort();
  });
});

it('retains posted work after reopening the SQLite database', () => {
  const directory = mkdtempSync(join(tmpdir(), 'smart-tutor-persistence-'));
  const databasePath = join(directory, 'classroom.sqlite');
  try {
    const first = createApp({ databasePath });
    first.locals.store.db.prepare('INSERT INTO doubts VALUES (?, ?, ?, ?, ?, ?, ?)').run('persistent-doubt', 'A question worth keeping', 'This question should survive a server restart.', 'English', 'aanya', 'open', new Date().toISOString());
    first.locals.store.db.close();
    const second = createApp({ databasePath });
    assert.equal(second.locals.store.doubt('persistent-doubt', 'aanya').title, 'A question worth keeping');
    assert.equal(second.locals.store.bootstrap('aanya').users.length, 4);
    second.locals.store.db.close();
  } finally { rmSync(directory, { recursive: true, force: true }); }
});
