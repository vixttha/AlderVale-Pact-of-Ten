import { writeFileSync } from 'node:fs';
import { createServer } from 'node:http';
import { createAldervaleApp } from '../../../server.ts';
import { attachAldervaleWebSocketServer } from '../../../server/wsHub.ts';

const server = createServer(await createAldervaleApp({ frontend: false }));
attachAldervaleWebSocketServer(server);
server.listen(0, '127.0.0.1', () => {
  writeFileSync(process.argv[2], String(server.address().port));
});
