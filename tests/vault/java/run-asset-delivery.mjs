import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { access } from 'node:fs/promises';
import { createServer } from 'node:http';
import { devNull } from 'node:os';

await access('dist/index.html');
process.env.NODE_ENV = 'production';
process.env.VITEST = 'true';
process.env.DOTENV_CONFIG_PATH = devNull;
process.env.GEMINI_API_KEY = '';

const { createAldervaleApp } = await import('../../../server.ts');
const server = createServer(await createAldervaleApp());
try {
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const child = spawn('java', [
    '--source', '21', 'tests/vault/java/AssetDeliveryContracts.java',
    String(server.address().port), 'dist',
    '/models/exported-model.glb', '/models/rowan-prototype.glb',
  ], { stdio: 'inherit', timeout: 120_000, killSignal: 'SIGKILL' });
  const [exitCode, signal] = await once(child, 'close');
  if (exitCode !== 0) {
    throw new Error(`Java asset delivery suite exited with ${signal ?? exitCode}`);
  }
} finally {
  await new Promise((resolve) => {
    server.close(resolve);
    server.closeAllConnections();
  });
}
