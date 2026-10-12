import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';

export const subjects = ['Mathematics', 'Physics', 'Chemistry', 'English'];

export function createStore(path, { seed = true } = {}) {
  if (path !== ':memory:') mkdirSync(dirname(path), { recursive: true });
  const db = new DatabaseSync(path);
  db.exec(`
    PRAGMA foreign_keys = ON;
    PRAGMA journal_mode = WAL;
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY, name TEXT NOT NULL, role TEXT NOT NULL, initials TEXT NOT NULL, color TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS doubts (
      id TEXT PRIMARY KEY, title TEXT NOT NULL, body TEXT NOT NULL, subject TEXT NOT NULL,
      author_id TEXT NOT NULL REFERENCES users(id), status TEXT NOT NULL DEFAULT 'open', created_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS replies (
      id TEXT PRIMARY KEY, doubt_id TEXT NOT NULL REFERENCES doubts(id),
      author_id TEXT NOT NULL REFERENCES users(id), body TEXT NOT NULL, created_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS bookmarks (
      user_id TEXT NOT NULL REFERENCES users(id), doubt_id TEXT NOT NULL REFERENCES doubts(id),
      PRIMARY KEY (user_id, doubt_id)
    );
    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY, title TEXT NOT NULL, description TEXT NOT NULL, subject TEXT NOT NULL,
      tutor_id TEXT NOT NULL REFERENCES users(id), starts_at TEXT NOT NULL, duration INTEGER NOT NULL, capacity INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS bookings (
      user_id TEXT NOT NULL REFERENCES users(id), session_id TEXT NOT NULL REFERENCES sessions(id),
      PRIMARY KEY (user_id, session_id)
    );
    CREATE TABLE IF NOT EXISTS messages (
      id TEXT PRIMARY KEY, session_id TEXT NOT NULL REFERENCES sessions(id),
      author_id TEXT NOT NULL REFERENCES users(id), body TEXT NOT NULL, created_at TEXT NOT NULL
    );
  `);
  if (seed && !db.prepare('SELECT COUNT(*) AS n FROM users').get().n) {
    const now = Date.now();
    const ago = (minutes) => new Date(now - minutes * 60_000).toISOString();
    const ahead = (hours) => new Date(now + hours * 3_600_000).toISOString();
    db.exec('BEGIN');
    try {
      const insertUser = db.prepare('INSERT INTO users VALUES (?, ?, ?, ?, ?)');
      [
        ['aanya', 'Aanya Sharma', 'student', 'AS', 'peach'],
        ['arjun', 'Arjun Mehta', 'student', 'AM', 'blue'],
        ['riya', 'Riya Patel', 'student', 'RP', 'purple'],
        ['tutor', 'Neha Kapoor', 'tutor', 'NK', 'green'],
      ].forEach((u) => insertUser.run(...u));
      const insertDoubt = db.prepare('INSERT INTO doubts VALUES (?, ?, ?, ?, ?, ?, ?)');
      [
        ['doubt-1', 'Why does the quadratic formula actually work?', 'I can use the formula to find the roots, but I want to understand where it comes from. How does completing the square lead to it? A step-by-step explanation would really help!', 'Mathematics', 'aanya', 'open', ago(35)],
        ['doubt-2', 'Does a heavier object fall faster?', 'If I drop a bowling ball and a tennis ball from the same height, which lands first? I’m confused about how gravity and air resistance change the answer.', 'Physics', 'arjun', 'open', ago(92)],
        ['doubt-3', 'An easy way to remember ionic vs. covalent bonds?', 'I keep mixing these up. Is there a simple example that explains sharing electrons versus transferring them?', 'Chemistry', 'riya', 'resolved', ago(180)],
        ['doubt-4', 'When should I use “has been” and “had been”?', 'Both describe things in the past, so how do I choose the right one? Could someone explain with a couple of sentences?', 'English', 'aanya', 'open', ago(240)],
      ].forEach((d) => insertDoubt.run(...d));
      const insertReply = db.prepare('INSERT INTO replies VALUES (?, ?, ?, ?, ?)');
      [
        ['reply-1', 'doubt-1', 'tutor', 'Great question, Aanya! Start with ax² + bx + c = 0. Divide by a, move c/a to the right, and add (b/2a)² to both sides. The left becomes (x + b/2a)². Take the square root, then subtract b/2a. You get x = (−b ± √(b² − 4ac)) / 2a. We’ll practice this together in our next session.', ago(20)],
        ['reply-2', 'doubt-2', 'riya', 'I saw a video where a feather and a bowling ball fell together in a vacuum. Without air resistance they hit the ground at the same time!', ago(60)],
        ['reply-3', 'doubt-3', 'tutor', 'Think of ionic bonding as giving a gift: sodium gives an electron to chlorine. Their opposite charges attract. Covalent bonding is sharing: two hydrogen atoms share their electrons to form H₂. Transfer = ionic; sharing = covalent.', ago(150)],
        ['reply-4', 'doubt-3', 'riya', 'The gift vs. sharing example makes so much sense. Thank you!', ago(140)],
      ].forEach((r) => insertReply.run(...r));
      const insertSession = db.prepare('INSERT INTO sessions VALUES (?, ?, ?, ?, ?, ?, ?, ?)');
      [
        ['session-1', 'Quadratic equations, made simple', 'Let’s make the quadratic formula feel intuitive. Bring your questions: we’ll explore completing the square, roots, and a few practice problems together.', 'Mathematics', 'tutor', ahead(2), 45, 12],
        ['session-2', 'Newton’s laws in everyday life', 'From kicking a football to wearing a seat belt, discover how Newton’s three laws explain the world around us.', 'Physics', 'tutor', ahead(25), 60, 10],
        ['session-3', 'A better bond with chemistry', 'Understand ionic and covalent bonds with simple examples, a guided discussion, and time for your doubts.', 'Chemistry', 'tutor', ahead(49), 45, 12],
      ].forEach((s) => insertSession.run(...s));
      db.prepare('INSERT INTO bookings VALUES (?, ?)').run('aanya', 'session-1');
      db.prepare('INSERT INTO bookings VALUES (?, ?)').run('arjun', 'session-1');
      db.prepare('INSERT INTO bookmarks VALUES (?, ?)').run('aanya', 'doubt-3');
      db.prepare('INSERT INTO messages VALUES (?, ?, ?, ?, ?)').run('message-1', 'session-1', 'tutor', 'Welcome to our study room! Share a question here before the session, and we’ll work through it together.', ago(10));
      db.exec('COMMIT');
    } catch (error) { db.exec('ROLLBACK'); throw error; }
  }
  const user = (id) => db.prepare('SELECT * FROM users WHERE id = ?').get(id);
  const decorateAuthor = (row) => {
    const { author_id, ...rest } = row;
    return { ...rest, author: user(author_id) };
  };
  function doubt(id, userId) {
    const row = db.prepare('SELECT * FROM doubts WHERE id = ?').get(id);
    if (!row) return null;
    return {
      ...decorateAuthor(row),
      saved: !!db.prepare('SELECT 1 FROM bookmarks WHERE user_id = ? AND doubt_id = ?').get(userId, id),
      replies: db.prepare('SELECT * FROM replies WHERE doubt_id = ? ORDER BY created_at, rowid').all(id).map(decorateAuthor),
    };
  }
  function session(id, userId) {
    const row = db.prepare('SELECT * FROM sessions WHERE id = ?').get(id);
    if (!row) return null;
    const { tutor_id, ...rest } = row;
    return {
      ...rest, tutor: user(tutor_id),
      booked: !!db.prepare('SELECT 1 FROM bookings WHERE user_id = ? AND session_id = ?').get(userId, id),
      attendees: db.prepare('SELECT COUNT(*) AS n FROM bookings WHERE session_id = ?').get(id).n,
    };
  }
  return {
    db, user, doubt, session,
    bootstrap(userId) {
      return {
        me: user(userId), users: db.prepare('SELECT * FROM users ORDER BY rowid').all(), subjects,
        doubts: db.prepare('SELECT id FROM doubts ORDER BY created_at DESC, rowid DESC').all().map((d) => doubt(d.id, userId)),
        sessions: db.prepare('SELECT id FROM sessions ORDER BY starts_at').all().map((s) => session(s.id, userId)),
      };
    },
    messages(sessionId) {
      return db.prepare('SELECT * FROM messages WHERE session_id = ? ORDER BY created_at, rowid').all(sessionId).map(decorateAuthor);
    },
  };
}
