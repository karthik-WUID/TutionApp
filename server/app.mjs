import express from 'express';
import { randomUUID } from 'node:crypto';
import { existsSync } from 'node:fs';
import { createStore, subjects } from './store.mjs';
import { registerLearning } from './learning.mjs';
import { registerProductivity } from './productivity.mjs';
import { registerCurriculumDirectory } from './curriculum-directory.mjs';
import { registerOxfordDictionary } from './oxford-dictionary.mjs';
import { createDictionaryPictureProvider } from './dictionary-pictures.mjs';

export function createApp({ databasePath = ':memory:', distPath, curriculumProvider, collinsProvider, oxfordProvider, dictionaryPictureProvider } = {}) {
  const app = express();
  const store = createStore(databasePath);
  const clients = new Set();
  app.locals.store = store;
  app.disable('x-powered-by');
  app.use(express.json({ limit: '128kb' }));
  app.use((_req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'same-origin');
    next();
  });
  const fail = (status, message) => { throw Object.assign(new Error(message), { status }); };
  const textField = (value, name, max, min = 1) => {
    if (typeof value !== 'string' || value.trim().length < min || value.trim().length > max) {
      fail(400, `${name} must be between ${min} and ${max} characters.`);
    }
    return value.trim();
  };
  const viewer = (req) => {
    const id = req.method === 'GET' ? req.query.userId : req.body?.userId;
    if (typeof id !== 'string' || !store.user(id)) fail(400, 'Please select a classroom profile.');
    return store.user(id);
  };
  const findDoubt = (req, me) => {
    const d = store.doubt(req.params.id, me.id);
    if (!d) fail(404, 'This doubt could not be found.');
    return d;
  };
  const findSession = (req, me) => {
    const s = store.session(req.params.id, me.id);
    if (!s) fail(404, 'This session could not be found.');
    return s;
  };
  const requireRoom = (session, me) => {
    if (!session.booked && session.tutor.id !== me.id) fail(403, 'Book a seat to enter this study room.');
  };
  const broadcast = () => {
    for (const res of clients) res.write('data: {"type":"update"}\n\n');
  };
  app.get('/api/health', (_req, res) => res.json({ status: 'ok', app: 'Smart tutor' }));
  app.get('/api/bootstrap', (req, res) => res.json(store.bootstrap(viewer(req).id)));
  app.get('/api/events', (req, res) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();
    res.write(': connected\n\n');
    clients.add(res);
    const heartbeat = setInterval(() => res.write(': heartbeat\n\n'), 25_000);
    req.on('close', () => { clearInterval(heartbeat); clients.delete(res); });
  });
  app.get('/api/doubts/:id', (req, res) => res.json(findDoubt(req, viewer(req))));
  app.post('/api/doubts', (req, res) => {
    const me = viewer(req);
    const title = textField(req.body.title, 'Your question', 140, 8);
    const body = textField(req.body.body, 'Details', 3000, 10);
    if (!subjects.includes(req.body.subject)) fail(400, 'Choose an available subject.');
    const id = randomUUID();
    store.db.prepare('INSERT INTO doubts VALUES (?, ?, ?, ?, ?, ?, ?)').run(id, title, body, req.body.subject, me.id, 'open', new Date().toISOString());
    broadcast();
    res.status(201).json(store.doubt(id, me.id));
  });
  app.post('/api/doubts/:id/replies', (req, res) => {
    const me = viewer(req);
    const doubt = findDoubt(req, me);
    const body = textField(req.body.body, 'Your reply', 3000);
    store.db.prepare('INSERT INTO replies VALUES (?, ?, ?, ?, ?)').run(randomUUID(), doubt.id, me.id, body, new Date().toISOString());
    broadcast();
    res.status(201).json(store.doubt(doubt.id, me.id));
  });
  app.patch('/api/doubts/:id', (req, res) => {
    const me = viewer(req);
    const doubt = findDoubt(req, me);
    if (doubt.author.id !== me.id && me.role !== 'tutor') fail(403, 'Only the author or a tutor can change this doubt’s status.');
    if (!['open', 'resolved'].includes(req.body.status)) fail(400, 'Choose open or resolved.');
    store.db.prepare('UPDATE doubts SET status = ? WHERE id = ?').run(req.body.status, doubt.id);
    broadcast();
    res.json(store.doubt(doubt.id, me.id));
  });
  app.post('/api/doubts/:id/bookmark', (req, res) => {
    const me = viewer(req);
    const doubt = findDoubt(req, me);
    if (typeof req.body.saved !== 'boolean') fail(400, 'Specify whether to save this doubt.');
    if (req.body.saved) store.db.prepare('INSERT OR IGNORE INTO bookmarks VALUES (?, ?)').run(me.id, doubt.id);
    else store.db.prepare('DELETE FROM bookmarks WHERE user_id = ? AND doubt_id = ?').run(me.id, doubt.id);
    broadcast();
    res.json(store.doubt(doubt.id, me.id));
  });
  app.post('/api/sessions/:id/booking', (req, res) => {
    const me = viewer(req);
    const session = findSession(req, me);
    if (typeof req.body.booked !== 'boolean') fail(400, 'Specify whether to book this session.');
    if (req.body.booked && !session.booked) {
      if (new Date(session.starts_at).getTime() + session.duration * 60_000 < Date.now()) fail(409, 'This session has already ended.');
      if (session.attendees >= session.capacity) fail(409, 'This session is full. Try another session.');
      const start = Date.parse(session.starts_at), end = start + session.duration * 60000;
      const planned = store.db.prepare('SELECT starts_at, minutes FROM study_blocks WHERE student_id = ?').all(me.id);
      const booked = store.db.prepare('SELECT s.starts_at, s.duration AS minutes FROM sessions s JOIN bookings b ON b.session_id = s.id WHERE b.user_id = ?').all(me.id);
      if ([...planned, ...booked].some((b) => Date.parse(b.starts_at) < end && Date.parse(b.starts_at) + b.minutes * 60000 > start)) fail(409, 'This session overlaps your timetable. Remove the overlapping study block or choose another session.');
      store.db.prepare('INSERT INTO bookings VALUES (?, ?)').run(me.id, session.id);
    } else if (!req.body.booked) store.db.prepare('DELETE FROM bookings WHERE user_id = ? AND session_id = ?').run(me.id, session.id);
    broadcast();
    res.json(store.session(session.id, me.id));
  });
  app.get('/api/sessions/:id/messages', (req, res) => {
    const me = viewer(req);
    requireRoom(findSession(req, me), me);
    res.json(store.messages(req.params.id));
  });
  app.post('/api/sessions/:id/messages', (req, res) => {
    const me = viewer(req);
    const session = findSession(req, me);
    requireRoom(session, me);
    const body = textField(req.body.body, 'Your message', 1500);
    store.db.prepare('INSERT INTO messages VALUES (?, ?, ?, ?, ?)').run(randomUUID(), session.id, me.id, body, new Date().toISOString());
    broadcast();
    res.status(201).json(store.messages(session.id));
  });
  registerLearning(app, { store, broadcast });
  registerProductivity(app, { store, broadcast });
  registerCurriculumDirectory(app, { store, provider: curriculumProvider, collinsProvider });
  registerOxfordDictionary(app, { store, provider: oxfordProvider, pictureProvider: dictionaryPictureProvider || createDictionaryPictureProvider() });
  app.use('/api', (_req, res) => res.status(404).json({ error: 'This API endpoint does not exist.' }));
  if (distPath && existsSync(distPath)) {
    app.use(express.static(distPath));
    app.get('/{*splat}', (_req, res) => res.sendFile(`${distPath}/index.html`));
  }
  app.use((error, _req, res, _next) => {
    const status = error.status || 500;
    if (status >= 500) console.error(error);
    res.status(status).json({ error: status >= 500 ? 'Something went wrong. Please try again.' : error.message });
  });
  return app;
}
