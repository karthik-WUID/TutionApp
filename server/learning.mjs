import { randomUUID } from 'node:crypto';
import { dictionary, lessons, publicLessons } from './curriculum.mjs';

export function registerLearning(app, { store, broadcast }) {
  const db = store.db;
  db.exec(`
    CREATE TABLE IF NOT EXISTS lesson_progress (
      user_id TEXT NOT NULL REFERENCES users(id), lesson_id TEXT NOT NULL,
      read INTEGER NOT NULL DEFAULT 0, visual INTEGER NOT NULL DEFAULT 0, updated_at TEXT NOT NULL,
      PRIMARY KEY(user_id, lesson_id)
    );
    CREATE TABLE IF NOT EXISTS homework (
      user_id TEXT NOT NULL REFERENCES users(id), lesson_id TEXT NOT NULL, answers TEXT NOT NULL,
      status TEXT NOT NULL, feedback TEXT NOT NULL DEFAULT '', updated_at TEXT NOT NULL,
      PRIMARY KEY(user_id, lesson_id)
    );
    CREATE TABLE IF NOT EXISTS quiz_attempts (
      id TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id), lesson_id TEXT NOT NULL,
      answers TEXT NOT NULL, results TEXT NOT NULL, score INTEGER NOT NULL, total INTEGER NOT NULL,
      created_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS moods (
      id TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id), mood TEXT NOT NULL,
      confidence INTEGER NOT NULL, note TEXT NOT NULL, created_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS learning_preferences (
      user_id TEXT PRIMARY KEY REFERENCES users(id), grade INTEGER NOT NULL DEFAULT 10,
      board TEXT NOT NULL DEFAULT 'CBSE'
    );
    CREATE TABLE IF NOT EXISTS textbook_mappings (
      board TEXT NOT NULL, grade INTEGER NOT NULL, lesson_id TEXT NOT NULL, title TEXT NOT NULL,
      edition TEXT NOT NULL, chapter TEXT NOT NULL, portions TEXT NOT NULL,
      PRIMARY KEY(board, grade, lesson_id)
    );
  `);
  const fail = (status, message) => { throw Object.assign(new Error(message), { status }); };
  const viewer = (req) => {
    const id = req.method === 'GET' ? req.query.userId : req.body?.userId;
    if (typeof id !== 'string' || !store.user(id)) fail(400, 'Please select a classroom profile.');
    return store.user(id);
  };
  const lesson = (req) => {
    const l = lessons.find((l) => l.id === req.params.id);
    if (!l) fail(404, 'This lesson could not be found.');
    return l;
  };
  const readHomework = (row) => row ? { ...row, answers: JSON.parse(row.answers) } : null;
  function snapshot(userId, target) {
    const preferences = db.prepare('SELECT grade, board FROM learning_preferences WHERE user_id = ?').get(userId) || { grade: 10, board: 'CBSE' };
    const selected = lessons.filter((l) => l.minGrade <= preferences.grade && l.maxGrade >= preferences.grade);
    if (target && !selected.some((l) => l.id === target)) {
      const assigned = lessons.find((l) => l.id === target);
      if (!assigned) fail(404, 'This lesson could not be found.');
      selected.push(assigned);
    }
    const ids = selected.map((l) => l.id);
    return {
      preferences, boards: ['CBSE', 'Tamil Nadu State Board', 'Matriculation / Collins'],
      lessons: publicLessons(selected), dictionary: dictionary.filter((term) => ids.includes(term.lessonId)),
      mappings: Object.fromEntries(db.prepare('SELECT * FROM textbook_mappings WHERE board = ? AND grade = ?').all(preferences.board, preferences.grade).map((m) => [m.lesson_id, m])),
      progress: Object.fromEntries(db.prepare('SELECT * FROM lesson_progress WHERE user_id = ?').all(userId).filter((p) => ids.includes(p.lesson_id)).map((p) => [p.lesson_id, { ...p, read: !!p.read, visual: !!p.visual }])),
      homework: Object.fromEntries(db.prepare('SELECT * FROM homework WHERE user_id = ?').all(userId).filter((h) => ids.includes(h.lesson_id)).map((h) => [h.lesson_id, readHomework(h)])),
      attempts: db.prepare('SELECT * FROM quiz_attempts WHERE user_id = ? ORDER BY created_at DESC, rowid DESC').all(userId).filter((a) => ids.includes(a.lesson_id)).map((a) => ({ ...a, answers: JSON.parse(a.answers), results: JSON.parse(a.results) })),
      moods: db.prepare('SELECT * FROM moods WHERE user_id = ? ORDER BY created_at DESC, rowid DESC LIMIT 50').all(userId),
    };
  }
  app.get('/api/learning', (req, res) => {
    if (req.query.lessonId !== undefined && typeof req.query.lessonId !== 'string') fail(400, 'Choose a valid lesson.');
    res.json(snapshot(viewer(req).id, req.query.lessonId));
  });
  app.post('/api/learning/preferences', (req, res) => {
    const me = viewer(req);
    const { grade, board } = req.body;
    if (!Number.isInteger(grade) || grade < 1 || grade > 12) fail(400, 'Choose a class between 1 and 12.');
    if (!['CBSE', 'Tamil Nadu State Board', 'Matriculation / Collins'].includes(board)) fail(400, 'Choose an available board.');
    db.prepare('INSERT INTO learning_preferences VALUES (?, ?, ?) ON CONFLICT(user_id) DO UPDATE SET grade = excluded.grade, board = excluded.board').run(me.id, grade, board);
    broadcast(); res.json(snapshot(me.id));
  });
  app.post('/api/lessons/:id/textbook', (req, res) => {
    const me = viewer(req), l = lesson(req);
    if (me.role !== 'tutor') fail(403, 'Only a tutor can map textbook portions.');
    const { grade, board, title, edition, chapter, portions } = req.body;
    if (!Number.isInteger(grade) || grade < l.minGrade || grade > l.maxGrade) fail(400, 'Choose a class in this lesson’s age range.');
    if (!['CBSE', 'Tamil Nadu State Board', 'Matriculation / Collins'].includes(board)) fail(400, 'Choose an available board.');
    for (const [name, value, max] of [['Book title', title, 160], ['Edition', edition, 80], ['Chapter', chapter, 160], ['Portions', portions, 1500]]) {
      if (typeof value !== 'string' || !value.trim() || value.length > max) fail(400, `${name} must contain 1 to ${max} characters.`);
    }
    db.prepare('INSERT INTO textbook_mappings VALUES (?, ?, ?, ?, ?, ?, ?) ON CONFLICT(board, grade, lesson_id) DO UPDATE SET title = excluded.title, edition = excluded.edition, chapter = excluded.chapter, portions = excluded.portions')
      .run(board, grade, l.id, title.trim(), edition.trim(), chapter.trim(), portions.trim());
    broadcast(); res.json({ saved: true });
  });
  app.patch('/api/lessons/:id/progress', (req, res) => {
    const me = viewer(req), l = lesson(req);
    const { activity, complete } = req.body;
    if (!['read', 'visual'].includes(activity) || typeof complete !== 'boolean') fail(400, 'Choose a valid lesson activity and completion state.');
    const now = new Date().toISOString();
    db.prepare('INSERT OR IGNORE INTO lesson_progress VALUES (?, ?, 0, 0, ?)').run(me.id, l.id, now);
    // The column is chosen from the fixed allowlist above, never arbitrary user input.
    db.prepare(`UPDATE lesson_progress SET ${activity} = ?, updated_at = ? WHERE user_id = ? AND lesson_id = ?`).run(complete ? 1 : 0, now, me.id, l.id);
    broadcast(); res.json(snapshot(me.id));
  });
  app.post('/api/lessons/:id/homework', (req, res) => {
    const me = viewer(req), l = lesson(req);
    const { answers, status } = req.body;
    if (!['draft', 'submitted'].includes(status)) fail(400, 'Choose draft or submitted.');
    if (!answers || typeof answers !== 'object' || Array.isArray(answers)) fail(400, 'Add your homework answers.');
    const ids = l.homework.map((q) => q.id);
    if (Object.keys(answers).some((id) => !ids.includes(id))) fail(400, 'This homework includes an unknown question.');
    const clean = {};
    for (const q of l.homework) {
      const value = answers[q.id] ?? '';
      if (typeof value !== 'string' || value.length > 3000) fail(400, 'Each answer must be text with at most 3000 characters.');
      if (status === 'submitted' && !value.trim()) fail(400, 'Answer every question before submitting. You can save an unfinished draft.');
      clean[q.id] = value.trim();
    }
    db.prepare(`INSERT INTO homework VALUES (?, ?, ?, ?, '', ?)
      ON CONFLICT(user_id, lesson_id) DO UPDATE SET answers = excluded.answers, status = excluded.status, feedback = '', updated_at = excluded.updated_at`)
      .run(me.id, l.id, JSON.stringify(clean), status, new Date().toISOString());
    broadcast(); res.json(readHomework(db.prepare('SELECT * FROM homework WHERE user_id = ? AND lesson_id = ?').get(me.id, l.id)));
  });
  app.patch('/api/lessons/:id/homework/review', (req, res) => {
    const me = viewer(req), l = lesson(req);
    if (me.role !== 'tutor') fail(403, 'Only a tutor can review homework.');
    const { studentId, feedback } = req.body;
    if (typeof studentId !== 'string' || !store.user(studentId)) fail(400, 'Choose a student.');
    if (typeof feedback !== 'string' || !feedback.trim() || feedback.length > 3000) fail(400, 'Add feedback between 1 and 3000 characters.');
    const h = db.prepare('SELECT * FROM homework WHERE user_id = ? AND lesson_id = ?').get(studentId, l.id);
    if (!h || h.status === 'draft') fail(409, 'This student has not submitted the homework yet.');
    db.prepare('UPDATE homework SET feedback = ?, status = ?, updated_at = ? WHERE user_id = ? AND lesson_id = ?').run(feedback.trim(), 'reviewed', new Date().toISOString(), studentId, l.id);
    broadcast(); res.json(readHomework(db.prepare('SELECT * FROM homework WHERE user_id = ? AND lesson_id = ?').get(studentId, l.id)));
  });
  app.post('/api/lessons/:id/test', (req, res) => {
    const me = viewer(req), l = lesson(req);
    const { answers } = req.body;
    if (!Array.isArray(answers) || answers.length !== l.questions.length || answers.some((answer, i) => !Number.isInteger(answer) || answer < 0 || answer >= l.questions[i].options.length)) fail(400, 'Choose an answer for every question before checking your test.');
    const results = l.questions.map((q, i) => ({ correct: q.answer === answers[i], correctIndex: q.answer, selectedIndex: answers[i], explanation: q.explanation }));
    const score = results.filter((r) => r.correct).length;
    const attempt = { id: randomUUID(), user_id: me.id, lesson_id: l.id, answers, results, score, total: l.questions.length, created_at: new Date().toISOString() };
    db.prepare('INSERT INTO quiz_attempts VALUES (?, ?, ?, ?, ?, ?, ?, ?)').run(attempt.id, me.id, l.id, JSON.stringify(answers), JSON.stringify(results), score, l.questions.length, attempt.created_at);
    broadcast(); res.status(201).json(attempt);
  });
  app.post('/api/moods', (req, res) => {
    const me = viewer(req);
    const { mood, confidence, note = '' } = req.body;
    if (!['excited', 'focused', 'okay', 'tired', 'stuck'].includes(mood)) fail(400, 'Choose how you are feeling.');
    if (!Number.isInteger(confidence) || confidence < 1 || confidence > 5) fail(400, 'Choose a confidence level from 1 to 5.');
    if (typeof note !== 'string' || note.length > 500) fail(400, 'Your note can be up to 500 characters.');
    const entry = { id: randomUUID(), user_id: me.id, mood, confidence, note: note.trim(), created_at: new Date().toISOString() };
    db.prepare('INSERT INTO moods VALUES (?, ?, ?, ?, ?, ?)').run(entry.id, me.id, mood, confidence, entry.note, entry.created_at);
    broadcast(); res.status(201).json(entry);
  });
}
