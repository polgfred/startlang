import { Interpreter, Snapshot } from '../interpreter.js';

import { BrowserHost, BrowserSnapshot } from './browser.js';

export class History {
  constructor(
    private readonly interpreter: Interpreter,
    private readonly host: BrowserHost
  ) {}

  private history: Snapshot[] = [];
  private hostHistory: BrowserSnapshot[] = [];
  currentIndex = 0;

  isEmpty() {
    return this.history.length === 0;
  }

  get current() {
    return this.history[this.currentIndex];
  }

  get currentHost() {
    return this.hostHistory[this.currentIndex];
  }

  get length() {
    return this.history.length;
  }

  clear() {
    this.history = [];
    this.hostHistory = [];
    this.currentIndex = 0;
  }

  push() {
    this.history.push(this.interpreter.takeSnapshot());
    this.hostHistory.push(this.host.takeSnapshot());
    this.currentIndex = this.history.length - 1;
  }

  moveToIndex(nextIndex: number) {
    this.currentIndex = nextIndex;
    this.interpreter.restoreSnapshot(this.history[nextIndex]);
    this.host.restoreSnapshot(this.hostHistory[nextIndex]);
  }
}
