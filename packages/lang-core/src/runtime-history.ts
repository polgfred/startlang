import type { RuntimeState } from './interpreter.js';

export class RuntimeHistory {
  entries: RuntimeState[] = [];
  index = 0;

  get length() {
    return this.entries.length;
  }

  get current() {
    return this.entries[this.index] ?? null;
  }

  get isRewound() {
    return this.index < this.entries.length - 1;
  }

  clear() {
    this.entries = [];
    this.index = 0;
  }

  push(state: RuntimeState) {
    this.entries.splice(this.index + 1);
    this.entries.push(state);
    this.index = this.entries.length - 1;
  }

  moveTo(index: number) {
    const entry = this.entries[index];
    if (!entry) {
      throw new Error(`history entry ${index} not found`);
    }

    this.index = index;
    return entry;
  }

  replaceCurrent(state: RuntimeState) {
    if (!this.current) {
      return;
    }

    this.truncateAfterCurrent();
    this.entries[this.index] = state;
  }

  truncateAfterCurrent() {
    this.entries.splice(this.index + 1);
  }
}
