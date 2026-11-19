import { execFile, spawn } from 'node:child_process';
import { once } from 'node:events';
import { access, mkdir, mkdtemp, readFile, rename, rm, writeFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import { join, resolve } from 'node:path';
import { promisify } from 'node:util';
import { fileURLToPath, pathToFileURL } from 'node:url';

const exec = promisify(execFile);
const installation = fileURLToPath(new URL('./.installation/', import.meta.url));
const upstream = 'https://github.com/vixttha/AlderVale-Pact-of-Ten.git';
const smoke = process.argv.includes('--smoke');
const installOnly = process.argv.includes('--install');
const checkout = process.argv.includes('--checkout');
const revisionPattern = /^[0-9a-f]{40}$/;
const host = '127.0.0.1';
const port = 4178;
const receipt = join(installation, 'current.txt');

function run(command, args, cwd) {
  return new Promise((accept, reject) => {
    const child = spawn(command, args, { cwd, stdio: 'inherit', windowsHide: true });
    child.once('error', reject);
    child.once('close', (code) => {
      if (code === 0) accept();
      else reject(new Error(`${command} ${args[0]} exited with status ${code}.`));
    });
  });
}

async function revision() {
  if (checkout) {
    const repo = resolve(installation, '..', '..');
    const { stdout } = await exec('git', ['rev-parse', 'HEAD'], { cwd: repo });
    return { repo, sha: stdout.trim() };
  }
  const repo = join(installation, 'repository.git');
  await exec('git', ['init', '--bare', repo], { windowsHide: true });
  await exec('git', ['fetch', '--depth=1', '--no-tags', upstream, '+refs/heads/main:refs/heads/play-main'], {
    cwd: repo, timeout: 120_000, windowsHide: true,
    env: { ...process.env, GIT_TERMINAL_PROMPT: '0' },
  });
  const { stdout } = await exec('git', ['rev-parse', 'refs/heads/play-main'], { cwd: repo });
  return { repo, sha: stdout.trim() };
}

async function build({ repo, sha }) {
  if (!revisionPattern.test(sha)) throw new Error('Invalid game revision.');
  const destination = join(installation, sha);
  try {
    await access(join(destination, 'dist', 'index.html'));
    return destination;
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
  }

  console.log(`Installing AlderVale ${sha.slice(0, 12)}...`);
  const staging = await mkdtemp(join(installation, 'build-'));
  try {
    const archive = join(staging, 'game.tar');
    const source = join(staging, 'source');
    await mkdir(source);
    await run('git', ['archive', '--format=tar', '-o', archive, sha], repo);
    await run('tar', ['-xf', archive, '-C', source], staging);
    // Invoke npm from this Node installation without a command shell.
    const npmDirectory = process.platform === 'win32'
      ? resolve(process.execPath, '..', 'node_modules')
      : resolve(process.execPath, '..', '..', 'lib', 'node_modules');
    const npm = join(npmDirectory, 'npm', 'bin', 'npm-cli.js');
    console.log('Installing locked game dependencies…');
    await run(process.execPath, [npm, 'ci', '--no-audit', '--no-fund', '--include=dev'], source);
    console.log('Building the game…');
    await run(process.execPath, [npm, 'run', 'build'], source);
    await access(join(source, 'dist', 'index.html'));
    try {
      await rename(source, destination);
    } catch (error) {
      // Another launcher may have completed the same immutable build first.
      if (!['EEXIST', 'ENOTEMPTY', 'EPERM'].includes(error.code)) throw error;
      await access(join(destination, 'dist', 'index.html'));
    }
    return destination;
  } finally {
    await rm(staging, { recursive: true, force: true });
  }
}

async function closeGame(server, hub) {
  await Promise.all([
    new Promise((resolve, reject) => hub.close(error => error ? reject(error) : resolve())),
    new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve())),
  ]);
}

async function startGame(directory, listenPort) {
  process.chdir(directory);
  process.env.NODE_ENV = 'production';
  process.env.GEMINI_API_KEY = '';
  process.env.VITEST = 'true'; // Use the server factory and bind it to loopback here.
  const fromGame = (file) => import(pathToFileURL(join(directory, file)).href);
  const { createAldervaleApp } = await fromGame('server.ts');
  const { attachAldervaleWebSocketServer } = await fromGame('server/wsHub.ts');
  const server = createServer(await createAldervaleApp());
  const hub = attachAldervaleWebSocketServer(server);
  try {
    server.listen(listenPort, host);
    await once(server, 'listening');
    const url = `http://${host}:${server.address().port}`;
    const health = await fetch(`${url}/api/health`, { signal: AbortSignal.timeout(5_000) });
    const page = await fetch(url, { signal: AbortSignal.timeout(5_000) });
    if (!health.ok || !(await health.json()).ok || !page.ok || !(await page.text()).includes('/assets/')) {
      throw new Error('The installed game failed its startup check.');
    }
    return { server, hub, url };
  } catch (error) {
    hub?.close();
    server.close();
    throw error;
  }
}

await mkdir(installation, { recursive: true });
try {
  if (checkout && !smoke) throw new Error('--checkout is reserved for smoke tests.');
  const [major, minor] = process.versions.node.split('.').map(Number);
  if (major < 24 || (major === 24 && minor < 12)) throw new Error('Install Node.js 24.12 or newer.');
  const installed = await readFile(receipt, 'utf8').catch((error) => {
    if (error.code !== 'ENOENT') throw error;
    return '';
  });
  let sha;
  let game;
  try {
    const latest = await revision();
    sha = latest.sha;
    game = await startGame(await build(latest), smoke || installOnly ? 0 : port);
  } catch (error) {
    if (smoke || installOnly || error.code === 'EADDRINUSE' || !revisionPattern.test(installed) || sha === installed) throw error;
    console.warn(`Update unavailable. Playing saved build ${installed.slice(0, 12)}. ${error.message}`);
    sha = installed;
    game = await startGame(join(installation, installed), port);
  }

  if (smoke) {
    await closeGame(game.server, game.hub);
    console.log(`AlderVale ${sha} passed the install and startup check.`);
  } else {
    if (sha !== installed) {
      const pending = join(installation, `current-${process.pid}.txt`);
      try {
        await writeFile(pending, sha);
        await rename(pending, receipt);
      } catch (error) {
        console.warn(`Could not save the current revision: ${error.message}`);
      }
    }
    if (installOnly) {
      await closeGame(game.server, game.hub);
      console.log(`Installed AlderVale ${sha}.`);
    } else {
      console.log(`AlderVale ${sha.slice(0, 12)} is ready at ${game.url}. Close this window to stop playing.`);
      const browser = spawn('explorer.exe', [game.url], { detached: true, stdio: 'ignore' });
      browser.on('error', () => console.log(`Open ${game.url} in your browser.`));
      browser.unref();
    }
  }
} catch (error) {
  console.error(error.code === 'EADDRINUSE'
    ? `Port ${port} is in use. Close the other game window and try again.`
    : `AlderVale could not start. ${error.message}`);
  process.exitCode = 1;
}
