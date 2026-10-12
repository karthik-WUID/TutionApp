import { randomUUID } from 'node:crypto';
import { lessons } from './curriculum.mjs';
import { languages, publicLanguages } from './languages.mjs';

export const studySubjects = ['Mathematics', 'Physics', 'Chemistry', 'English', 'Hindi', 'Tamil', 'Malayalam', 'French', 'Spanish', 'Japanese', 'Mandarin Chinese', 'Projects', 'Research'];
export const localDate = (date = new Date()) => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' }).format(date);
const timestamp = (day, time) => new Date(`${day}T${time}:00+05:30`).toISOString();
const addDays = (day, offset) => new Date(Date.parse(`${day}T12:00:00Z`) + offset * 86400000).toISOString().slice(0, 10);
const defaults = { dailyMinutes: 60, startTime: '18:00', blockMinutes: 25, weekdays: [1, 2, 3, 4, 5, 6], weights: [{ subject: 'Mathematics', weight: 3 }, { subject: 'Physics', weight: 2 }, { subject: 'Chemistry', weight: 2 }, { subject: 'English', weight: 2 }] };
const kinds = ['homework', 'reading', 'writing', 'speaking', 'project', 'research'];

export function registerProductivity(app, { store, broadcast }) {
  const db = store.db;
  db.exec(`
    CREATE TABLE IF NOT EXISTS workspace_tasks (
      id TEXT PRIMARY KEY, student_id TEXT NOT NULL REFERENCES users(id), subject TEXT NOT NULL,
      title TEXT NOT NULL, kind TEXT NOT NULL, instructions TEXT NOT NULL, due_at TEXT NOT NULL,
      minutes INTEGER NOT NULL, status TEXT NOT NULL, work TEXT NOT NULL DEFAULT '',
      feedback TEXT NOT NULL DEFAULT '', lesson_id TEXT, steps TEXT NOT NULL DEFAULT '[]',
      completed_steps TEXT NOT NULL DEFAULT '[]', created_at TEXT NOT NULL, updated_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS workspace_seed (student_id TEXT PRIMARY KEY REFERENCES users(id));
    CREATE TABLE IF NOT EXISTS study_settings (student_id TEXT PRIMARY KEY REFERENCES users(id), settings TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS study_blocks (
      id TEXT PRIMARY KEY, student_id TEXT NOT NULL REFERENCES users(id), task_id TEXT REFERENCES workspace_tasks(id) ON DELETE SET NULL,
      subject TEXT NOT NULL, title TEXT NOT NULL, starts_at TEXT NOT NULL, minutes INTEGER NOT NULL,
      status TEXT NOT NULL, source TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS language_practice (
      student_id TEXT NOT NULL REFERENCES users(id), language_id TEXT NOT NULL, writing TEXT NOT NULL DEFAULT '',
      speaking TEXT NOT NULL DEFAULT '', confidence INTEGER NOT NULL DEFAULT 3, reading TEXT,
      updated_at TEXT NOT NULL, PRIMARY KEY(student_id, language_id)
    );
    CREATE TABLE IF NOT EXISTS skill_entries (
      id TEXT PRIMARY KEY, student_id TEXT NOT NULL REFERENCES users(id), kind TEXT NOT NULL,
      title TEXT NOT NULL, question TEXT NOT NULL, body TEXT NOT NULL, conclusion TEXT NOT NULL,
      sources TEXT NOT NULL, checklist TEXT NOT NULL, status TEXT NOT NULL,
      feedback TEXT NOT NULL DEFAULT '', updated_at TEXT NOT NULL
    );
  `);
  const fail = (status, message) => { throw Object.assign(new Error(message), { status }); };
  const string = (value, label, max = 1000, required = true) => {
    if (typeof value !== 'string' || value.length > max || (required && !value.trim())) fail(400, `${label} must contain ${required ? '1' : '0'}–${max} characters.`);
    return value.trim();
  };
  const context = (req) => {
    const values = req.method === 'GET' ? req.query : req.body;
    const actor = typeof values?.userId === 'string' ? store.user(values.userId) : null;
    if (!actor) fail(400, 'Choose a classroom profile.');
    if (values.studentId !== undefined && typeof values.studentId !== 'string') fail(400, 'Choose a student to view.');
    const student = store.user(values.studentId || actor.id);
    if (!student || student.role !== 'student') fail(400, 'Choose a student to view.');
    if (actor.role !== 'tutor' && actor.id !== student.id) fail(403, 'Students can edit only their own portfolio.');
    return { actor, student };
  };
  const studentOnly = (ctx) => { if (ctx.actor.role !== 'student') fail(403, 'This activity belongs to the student.'); };
  const owned = (table, id, ctx) => {
    const row = db.prepare(`SELECT * FROM ${table} WHERE id = ?`).get(id);
    if (!row) fail(404, 'This item could not be found.');
    if (row.student_id !== ctx.student.id) fail(403, 'Choose the student who owns this item.');
    return row;
  };
  const readTask = (row) => {
    const task = { ...row, steps: JSON.parse(row.steps), completed_steps: JSON.parse(row.completed_steps) };
    if (task.lesson_id) {
      const homework = db.prepare('SELECT status, feedback FROM homework WHERE user_id = ? AND lesson_id = ?').get(task.student_id, task.lesson_id);
      task.status = homework ? (homework.status === 'draft' ? 'in_progress' : homework.status) : 'todo';
      task.feedback = homework?.feedback || '';
    }
    return task;
  };
  const seed = (studentId) => {
    if (db.prepare('SELECT 1 FROM workspace_seed WHERE student_id = ?').get(studentId)) return;
    const grade = db.prepare('SELECT grade FROM learning_preferences WHERE user_id = ?').get(studentId)?.grade || 10;
    const lesson = lessons.find((l) => l.subject === 'Mathematics' && l.minGrade <= grade && l.maxGrade >= grade);
    const now = new Date().toISOString(), due = timestamp(addDays(localDate(), 2), '18:00');
    db.exec('BEGIN');
    try {
      const insert = db.prepare('INSERT INTO workspace_tasks (id, student_id, subject, title, kind, instructions, due_at, minutes, status, lesson_id, steps, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
      insert.run(randomUUID(), studentId, 'Mathematics', `Practise: ${lesson.title}`, 'homework', 'Complete the written, one-word, and end-of-lesson questions. Your lesson submission and tutor feedback appear here automatically.', due, 25, 'todo', lesson.id, '[]', now, now);
      insert.run(randomUUID(), studentId, 'Projects', 'A little science in everyday life', 'project', 'Choose one observation from home. Explain it using a drawing, a short paragraph, and a safe demonstration or example.', timestamp(addDays(localDate(), 5), '18:00'), 30, 'todo', null, JSON.stringify(['Choose an observation', 'Research and sketch', 'Explain and present']), now, now);
      db.prepare('INSERT INTO workspace_seed VALUES (?)').run(studentId);
      db.exec('COMMIT');
    } catch (error) { db.exec('ROLLBACK'); throw error; }
  };
  const settings = (id) => JSON.parse(db.prepare('SELECT settings FROM study_settings WHERE student_id = ?').get(id)?.settings || JSON.stringify(defaults));
  const sessions = (id) => db.prepare('SELECT s.* FROM sessions s JOIN bookings b ON b.session_id = s.id WHERE b.user_id = ? ORDER BY starts_at').all(id);
  const snapshot = (id) => {
    seed(id);
    return {
      subjects: studySubjects, settings: settings(id), timezone: 'Asia/Kolkata',
      tasks: db.prepare('SELECT * FROM workspace_tasks WHERE student_id = ? ORDER BY due_at, created_at').all(id).map(readTask),
      blocks: db.prepare('SELECT * FROM study_blocks WHERE student_id = ? ORDER BY starts_at').all(id),
      sessions: sessions(id), languages: publicLanguages(),
      practice: Object.fromEntries(db.prepare('SELECT * FROM language_practice WHERE student_id = ?').all(id).map((p) => [p.language_id, { ...p, reading: p.reading ? JSON.parse(p.reading) : null }])),
      entries: db.prepare('SELECT * FROM skill_entries WHERE student_id = ? ORDER BY updated_at DESC').all(id).map((e) => ({ ...e, sources: JSON.parse(e.sources), checklist: JSON.parse(e.checklist) })),
    };
  };
  const reply = (res, ctx, extra = {}) => { broadcast(); res.json({ ...snapshot(ctx.student.id), ...extra }); };
  const validDate = (value) => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(`${value}T00:00:00Z`)) && new Date(`${value}T00:00:00Z`).toISOString().slice(0, 10) === value;
  const dateTime = (value, label) => {
    if (typeof value !== 'string' || !/T.*(Z|[+-]\d{2}:\d{2})$/.test(value) || !Number.isFinite(Date.parse(value))) fail(400, `Choose a valid ${label} with a timezone.`);
    return new Date(value).toISOString();
  };
  app.get('/api/workspace', (req, res) => res.json(snapshot(context(req).student.id)));
  app.post('/api/workspace/tasks', (req, res) => {
    const ctx = context(req), b = req.body;
    seed(ctx.student.id);
    const title = string(b.title, 'Title', 160), instructions = string(b.instructions, 'Instructions', 4000, false);
    if (!studySubjects.includes(b.subject) || !kinds.includes(b.kind)) fail(400, 'Choose a subject and activity type.');
    if (!Number.isInteger(b.minutes) || b.minutes < 5 || b.minutes > 180) fail(400, 'Estimate 5–180 minutes.');
    const due = dateTime(b.dueAt, 'deadline');
    const steps = b.steps || [];
    if (!Array.isArray(steps) || steps.length > 10) fail(400, 'Add up to 10 project steps.');
    const cleanSteps = steps.map((s) => string(s, 'Project step', 160));
    if (new Set(cleanSteps).size !== cleanSteps.length) fail(400, 'Use distinct project steps.');
    const lessonId = b.lessonId || null;
    if (lessonId && (!lessons.some((l) => l.id === lessonId && l.subject === b.subject) || b.kind !== 'homework')) fail(400, 'Link homework to a lesson in the same subject.');
    const now = new Date().toISOString();
    db.prepare('INSERT INTO workspace_tasks (id, student_id, subject, title, kind, instructions, due_at, minutes, status, lesson_id, steps, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')
      .run(randomUUID(), ctx.student.id, b.subject, title, b.kind, instructions, due, b.minutes, 'todo', lessonId, JSON.stringify(cleanSteps), now, now);
    reply(res, ctx);
  });
  app.patch('/api/workspace/tasks/:id', (req, res) => {
    const ctx = context(req), task = owned('workspace_tasks', req.params.id, ctx);
    studentOnly(ctx);
    if (task.lesson_id) fail(400, 'Save linked homework in the lesson practice form.');
    const work = string(req.body.work, 'Your work', 12000, false), completed = req.body.completedSteps;
    if (!['in_progress', 'submitted'].includes(req.body.status)) fail(400, 'Save a draft or submit your work.');
    const steps = JSON.parse(task.steps);
    if (!Array.isArray(completed) || new Set(completed).size !== completed.length || completed.some((s) => !steps.includes(s))) fail(400, 'Choose valid project steps.');
    if (req.body.status === 'submitted' && (work.length < 10 || completed.length !== steps.length)) fail(400, 'Write at least 10 characters and finish each project step before submitting.');
    db.prepare('UPDATE workspace_tasks SET work = ?, completed_steps = ?, status = ?, feedback = ?, updated_at = ? WHERE id = ?').run(work, JSON.stringify(completed), req.body.status, '', new Date().toISOString(), task.id);
    reply(res, ctx);
  });
  app.post('/api/workspace/tasks/:id/review', (req, res) => {
    const ctx = context(req), task = owned('workspace_tasks', req.params.id, ctx);
    if (ctx.actor.role !== 'tutor') fail(403, 'Only a tutor can review work.');
    if (task.lesson_id) fail(400, 'Review linked homework in the lesson practice form.');
    if (!['submitted', 'reviewed'].includes(task.status)) fail(400, 'Wait for the student to submit their work.');
    const feedback = string(req.body.feedback, 'Feedback', 3000);
    db.prepare('UPDATE workspace_tasks SET feedback = ?, status = ?, updated_at = ? WHERE id = ?').run(feedback, 'reviewed', new Date().toISOString(), task.id);
    reply(res, ctx);
  });
  app.post('/api/workspace/settings', (req, res) => {
    const ctx = context(req), s = req.body.settings;
    if (!s || !Number.isInteger(s.dailyMinutes) || s.dailyMinutes < 20 || s.dailyMinutes > 180 || !Number.isInteger(s.blockMinutes) || s.blockMinutes < 10 || s.blockMinutes > 60 || s.blockMinutes > s.dailyMinutes) fail(400, 'Use a daily budget of 20–180 minutes and blocks of 10–60 minutes.');
    if (typeof s.startTime !== 'string' || !/^([01]\d|2[0-3]):[0-5]\d$/.test(s.startTime)) fail(400, 'Choose a valid start time.');
    if (Number(s.startTime.slice(0, 2)) * 60 + Number(s.startTime.slice(3)) + s.dailyMinutes > 1440) fail(400, 'Keep the study window within the same day.');
    if (!Array.isArray(s.weekdays) || !s.weekdays.length || s.weekdays.some((d) => !Number.isInteger(d) || d < 0 || d > 6) || new Set(s.weekdays).size !== s.weekdays.length) fail(400, 'Choose distinct study days.');
    if (!Array.isArray(s.weights) || !s.weights.length || s.weights.length > studySubjects.length || s.weights.some((w) => !studySubjects.includes(w.subject) || !Number.isInteger(w.weight) || w.weight < 1 || w.weight > 5) || new Set(s.weights.map((w) => w.subject)).size !== s.weights.length) fail(400, 'Choose distinct subjects with priority 1–5.');
    db.prepare('INSERT INTO study_settings VALUES (?, ?) ON CONFLICT(student_id) DO UPDATE SET settings = excluded.settings').run(ctx.student.id, JSON.stringify({ dailyMinutes: s.dailyMinutes, startTime: s.startTime, blockMinutes: s.blockMinutes, weekdays: s.weekdays, weights: s.weights }));
    reply(res, ctx);
  });
  const conflicts = (ctx, start, minutes, excluding) => {
    const end = start + minutes * 60000;
    return [...db.prepare('SELECT * FROM study_blocks WHERE student_id = ?').all(ctx.student.id).filter((b) => b.id !== excluding).map((b) => ({ start: Date.parse(b.starts_at), end: Date.parse(b.starts_at) + b.minutes * 60000 })), ...sessions(ctx.student.id).map((s) => ({ start: Date.parse(s.starts_at), end: Date.parse(s.starts_at) + s.duration * 60000 }))].filter((b) => b.start < end && b.end > start);
  };
  app.post('/api/workspace/blocks', (req, res) => {
    const ctx = context(req), b = req.body;
    if (!studySubjects.includes(b.subject) || !Number.isInteger(b.minutes) || b.minutes < 5 || b.minutes > 180) fail(400, 'Choose a subject and a duration of 5–180 minutes.');
    const start = dateTime(b.startsAt, 'study time'), title = string(b.title, 'Session title', 160);
    if (conflicts(ctx, Date.parse(start), b.minutes).length) fail(409, 'This time overlaps a study block or booked session. Choose another time.');
    if (b.taskId) { const task = owned('workspace_tasks', b.taskId, ctx); if (task.subject !== b.subject) fail(400, 'Use the assignment’s subject.'); }
    db.prepare('INSERT INTO study_blocks VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)').run(randomUUID(), ctx.student.id, b.taskId || null, b.subject, title, start, b.minutes, 'planned', 'manual');
    reply(res, ctx);
  });
  app.patch('/api/workspace/blocks/:id', (req, res) => {
    const ctx = context(req), block = owned('study_blocks', req.params.id, ctx);
    studentOnly(ctx);
    if (!['planned', 'completed'].includes(req.body.status)) fail(400, 'Choose a valid completion state.');
    db.prepare('UPDATE study_blocks SET status = ? WHERE id = ?').run(req.body.status, block.id);
    reply(res, ctx);
  });
  app.delete('/api/workspace/blocks/:id', (req, res) => { const ctx = context(req), block = owned('study_blocks', req.params.id, ctx); db.prepare('DELETE FROM study_blocks WHERE id = ?').run(block.id); reply(res, ctx); });
  app.post('/api/workspace/generate', (req, res) => {
    const ctx = context(req), from = req.body.from;
    if (!validDate(from)) fail(400, 'Choose a valid first day.');
    seed(ctx.student.id);
    const s = settings(ctx.student.id), until = addDays(from, 7);
    const tasks = db.prepare('SELECT * FROM workspace_tasks WHERE student_id = ? ORDER BY due_at').all(ctx.student.id).map(readTask).filter((t) => !['submitted', 'reviewed'].includes(t.status) && s.weights.some((w) => w.subject === t.subject));
    let created = 0;
    db.exec('BEGIN');
    try {
      db.prepare("DELETE FROM study_blocks WHERE student_id = ? AND source = 'generated' AND status = 'planned' AND starts_at >= ? AND starts_at < ?").run(ctx.student.id, timestamp(from, '00:00'), timestamp(until, '00:00'));
      const existing = db.prepare('SELECT * FROM study_blocks WHERE student_id = ? AND starts_at >= ? AND starts_at < ?').all(ctx.student.id, timestamp(from, '00:00'), timestamp(until, '00:00'));
      const allocated = new Map();
      for (const b of existing) if (b.task_id) allocated.set(b.task_id, (allocated.get(b.task_id) || 0) + b.minutes);
      const counts = Object.fromEntries(s.weights.map((w) => [w.subject, 0]));
      for (const b of existing) if (b.subject in counts) counts[b.subject] += b.minutes;
      const insert = db.prepare('INSERT INTO study_blocks VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)');
      for (let d = 0; d < 7; d++) {
        const day = addDays(from, d), weekday = new Date(`${day}T12:00:00Z`).getUTCDay();
        if (!s.weekdays.includes(weekday)) continue;
        let cursor = Date.parse(timestamp(day, s.startTime));
        const end = cursor + s.dailyMinutes * 60000;
        while (cursor + 10 * 60000 <= end) {
          if (cursor < Date.now()) { cursor += s.blockMinutes * 60000; continue; }
          const urgent = tasks.find((t) => (allocated.get(t.id) || 0) < t.minutes && Date.parse(t.due_at) <= end + 86400000);
          const subject = urgent?.subject || [...s.weights].sort((a, b) => counts[a.subject] / a.weight - counts[b.subject] / b.weight)[0].subject;
          const task = urgent || tasks.find((t) => t.subject === subject && (allocated.get(t.id) || 0) < t.minutes);
          const minutes = Math.min(task ? task.minutes - (allocated.get(task.id) || 0) : s.blockMinutes, s.blockMinutes, Math.floor((end - cursor) / 60000));
          const clash = conflicts(ctx, cursor, minutes);
          if (clash.length) { cursor = Math.max(...clash.map((c) => c.end)) + 5 * 60000; continue; }
          insert.run(randomUUID(), ctx.student.id, task?.id || null, subject, task?.title || `${subject} · revision & practice`, new Date(cursor).toISOString(), minutes, 'planned', 'generated');
          counts[subject] += minutes; if (task) allocated.set(task.id, (allocated.get(task.id) || 0) + minutes); created++;
          cursor += (minutes + 5) * 60000;
        }
      }
      db.exec('COMMIT');
    } catch (error) { db.exec('ROLLBACK'); throw error; }
    reply(res, ctx, { generated: created });
  });
  const language = (req) => { const l = languages.find((l) => l.id === req.params.id); if (!l) fail(404, 'Choose an available language.'); return l; };
  const ensurePractice = (ctx, l) => db.prepare('INSERT OR IGNORE INTO language_practice (student_id, language_id, updated_at) VALUES (?, ?, ?)').run(ctx.student.id, l.id, new Date().toISOString());
  app.post('/api/workspace/languages/:id/reading', (req, res) => {
    const ctx = context(req); studentOnly(ctx); const l = language(req), answers = req.body.answers;
    if (!Array.isArray(answers) || answers.length !== l.questions.length || answers.some((a, i) => !Number.isInteger(a) || a < 0 || a >= l.questions[i].options.length)) fail(400, 'Answer every reading question.');
    const results = l.questions.map((q, i) => ({ correct: answers[i] === q.answer, answer: q.answer, explanation: q.explanation }));
    const reading = { score: results.filter((r) => r.correct).length, total: results.length, results, answers, at: new Date().toISOString() };
    ensurePractice(ctx, l);
    db.prepare('UPDATE language_practice SET reading = ?, updated_at = ? WHERE student_id = ? AND language_id = ?').run(JSON.stringify(reading), reading.at, ctx.student.id, l.id);
    reply(res, ctx);
  });
  app.post('/api/workspace/languages/:id/practice', (req, res) => {
    const ctx = context(req); studentOnly(ctx); const l = language(req);
    const writing = string(req.body.writing, 'Writing practice', 6000, false), speaking = string(req.body.speaking, 'Communication reflection', 3000, false);
    if (!Number.isInteger(req.body.confidence) || req.body.confidence < 1 || req.body.confidence > 5) fail(400, 'Rate your speaking confidence from 1 to 5.');
    ensurePractice(ctx, l);
    db.prepare('UPDATE language_practice SET writing = ?, speaking = ?, confidence = ?, updated_at = ? WHERE student_id = ? AND language_id = ?').run(writing, speaking, req.body.confidence, new Date().toISOString(), ctx.student.id, l.id);
    reply(res, ctx);
  });
  app.post('/api/workspace/entries', (req, res) => {
    const ctx = context(req); studentOnly(ctx); const b = req.body;
    if (!['writing', 'speaking', 'project', 'research'].includes(b.kind) || !['draft', 'completed'].includes(b.status)) fail(400, 'Choose an activity type and draft or completed.');
    const title = string(b.title, 'Title', 160), question = string(b.question, 'Question or goal', 500, false), body = string(b.body, 'Your work', 12000, false), conclusion = string(b.conclusion, 'Conclusion or reflection', 3000, false);
    if (!Array.isArray(b.sources) || b.sources.length > 10) fail(400, 'Add up to 10 sources.');
    const sources = b.sources.map((s) => {
      const title = string(s.title, 'Source title', 160), url = string(s.url, 'Source URL', 2000), note = string(s.note, 'Source notes', 1000, false);
      let parsed; try { parsed = new URL(url); } catch { fail(400, 'Use a complete HTTPS source URL.'); }
      if (parsed.protocol !== 'https:' || parsed.username || parsed.password) fail(400, 'Use a public HTTPS source URL without account credentials.');
      return { title, url: parsed.href, note };
    });
    if (!Array.isArray(b.checklist) || b.checklist.length > 10 || b.checklist.some((c) => typeof c !== 'string' || c.length > 160)) fail(400, 'Choose valid reflection steps.');
    if (b.status === 'completed' && (body.length < 20 || !conclusion || (b.kind === 'research' && (!question || !sources.length)))) fail(400, 'Add your work and reflection. Completed research also needs a question and at least one source.');
    const id = b.id || randomUUID();
    if (b.id) { const prior = owned('skill_entries', b.id, ctx); if (prior.kind !== b.kind) fail(400, 'Keep the original activity type.'); }
    db.prepare('INSERT INTO skill_entries VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) ON CONFLICT(id) DO UPDATE SET title = excluded.title, question = excluded.question, body = excluded.body, conclusion = excluded.conclusion, sources = excluded.sources, checklist = excluded.checklist, status = excluded.status, feedback = excluded.feedback, updated_at = excluded.updated_at')
      .run(id, ctx.student.id, b.kind, title, question, body, conclusion, JSON.stringify(sources), JSON.stringify(b.checklist), b.status, '', new Date().toISOString());
    reply(res, ctx);
  });
  app.post('/api/workspace/entries/:id/review', (req, res) => {
    const ctx = context(req), entry = owned('skill_entries', req.params.id, ctx);
    if (ctx.actor.role !== 'tutor') fail(403, 'Only a tutor can give feedback.');
    if (entry.status !== 'completed') fail(400, 'Wait for the student to complete this activity.');
    db.prepare('UPDATE skill_entries SET feedback = ?, updated_at = ? WHERE id = ?').run(string(req.body.feedback, 'Feedback', 3000), new Date().toISOString(), entry.id);
    reply(res, ctx);
  });
}
