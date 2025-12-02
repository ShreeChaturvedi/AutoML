import { createApp } from './app.js';
import { env } from './config.js';
import { verifyDatabaseConnection } from './db.js';

const app = createApp();

app.listen(env.port, () => {
  console.log(`Server listening on http://localhost:${env.port}`);
});

void verifyDatabaseConnection().catch((error) => {
  console.error('[db] Failed to verify Postgres connection', error);
  process.exitCode = 1;
});
