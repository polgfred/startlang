import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Worker } from 'node:worker_threads';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const workspaceRoot = path.resolve(__dirname, '..', '..');
const workerPath = path.join(__dirname, 'worker.ts');
const hooksPath = path.join(workspaceRoot, 'tools', 'hooks.js');

export class EngineManager {
  #worker = null;
  #requestId = 0;
  #pending = new Map();

  start() {
    if (this.#worker) {
      return;
    }
    const worker = new Worker(workerPath, {
      execArgv: ['--import', 'tsx', '--import', hooksPath],
    });

    worker.on('message', (message) => {
      const pending = this.#pending.get(message.id);
      if (!pending) {
        return;
      }
      this.#pending.delete(message.id);
      if (message.ok) {
        pending.resolve(message.result);
      } else {
        pending.reject(new Error(message.error));
      }
    });

    worker.on('error', (error) => {
      for (const pending of this.#pending.values()) {
        pending.reject(error);
      }
      this.#pending.clear();
      this.#worker = null;
    });

    worker.on('exit', () => {
      this.#worker = null;
    });

    this.#worker = worker;
  }

  stop() {
    if (this.#worker) {
      this.#worker.terminate();
      this.#worker = null;
    }
  }

  request(type, payload) {
    this.start();
    const id = ++this.#requestId;
    const message = { id, type, payload };
    return new Promise((resolve, reject) => {
      this.#pending.set(id, { resolve, reject });
      this.#worker.postMessage(message);
    });
  }
}
