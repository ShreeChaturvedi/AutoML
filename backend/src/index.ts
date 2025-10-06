import { createApp } from './app.js';
import { env } from './config.js';

const app = createApp();

app.listen(env.port, () => {
  console.log(`Server listening on http://localhost:${env.port}`);
});
