import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import { existsSync } from 'node:fs';
import { createApp } from './app.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
// Local secrets never go through Vite. Explicit environment variables take priority.
for (const name of ['.env.local', '.env']) {
  const path = resolve(root, name);
  if (existsSync(path)) process.loadEnvFile(path);
}
const port = Number(process.env.PORT || 3001);
const app = createApp({
  databasePath: process.env.DATABASE_PATH || resolve(root, '.data/smart-tutor.sqlite'),
  distPath: resolve(root, 'dist'),
});
const server = app.listen(port, '0.0.0.0', () => console.log(`Smart tutor is listening on port ${port}`));
function shutdown() {
  server.close(() => { app.locals.store.db.close(); process.exit(0); });
  setTimeout(() => process.exit(0), 3000).unref();
}
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
