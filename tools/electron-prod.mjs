import { spawn } from 'node:child_process';
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const standaloneServer = path.join(rootDir, '.next', 'standalone', 'server.js');
const port = process.env.PORT ?? '3210';
const startUrl = `http://127.0.0.1:${port}`;

function waitForServer(url, timeoutMs = 60_000) {
  const startedAt = Date.now();
  return new Promise((resolve, reject) => {
    const probe = () => {
      const req = http.get(url, (res) => {
        res.resume();
        resolve();
      });
      req.on('error', () => {
        if (Date.now() - startedAt > timeoutMs) {
          reject(new Error(`Timed out waiting for ${url}`));
          return;
        }
        setTimeout(probe, 600);
      });
    };
    probe();
  });
}

function spawnChild(command, args, env) {
  return spawn(command, args, {
    cwd: rootDir,
    env,
    stdio: 'inherit',
  });
}

if (!fs.existsSync(standaloneServer)) {
  // eslint-disable-next-line no-console
  console.error(
    'Missing .next/standalone/server.js. Run "npm run build" before start:desktop.'
  );
  process.exit(1);
}

const serverProc = spawnChild(process.execPath, [standaloneServer], {
  ...process.env,
  PORT: String(port),
  HOSTNAME: '127.0.0.1',
});
let electronProc = null;

serverProc.on('exit', (code) => {
  if (electronProc && !electronProc.killed) {
    electronProc.kill();
  }
  process.exit(code ?? 0);
});

waitForServer(startUrl)
  .then(() => {
    electronProc = spawnChild('npx', ['electron', './electron/main.mjs'], {
      ...process.env,
      ELECTRON_START_URL: startUrl,
    });
    electronProc.on('exit', () => {
      if (!serverProc.killed) {
        serverProc.kill();
      }
    });
  })
  .catch((error) => {
    // eslint-disable-next-line no-console
    console.error(error.message);
    if (!serverProc.killed) {
      serverProc.kill();
    }
    process.exit(1);
  });
