import { spawn } from 'node:child_process';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const startUrl = 'http://127.0.0.1:3000';

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

const nextProc = spawnChild('npm', ['run', 'dev'], process.env);
let electronProc = null;

nextProc.on('exit', (code) => {
  if (electronProc && !electronProc.killed) {
    electronProc.kill();
  }
  process.exit(code ?? 0);
});

waitForServer(startUrl)
  .then(() => {
    electronProc = spawnChild(
      'npx',
      ['electron', './electron/main.mjs'],
      {
        ...process.env,
        ELECTRON_START_URL: startUrl,
      }
    );
    electronProc.on('exit', () => {
      if (!nextProc.killed) {
        nextProc.kill();
      }
    });
  })
  .catch((error) => {
    // eslint-disable-next-line no-console
    console.error(error.message);
    if (!nextProc.killed) {
      nextProc.kill();
    }
    process.exit(1);
  });
