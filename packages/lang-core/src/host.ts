export interface SupportsSnapshots<T = unknown> {
  takeSnapshot(): T;
  restoreSnapshot(snapshot: T): void;
}

export class NullHost implements SupportsSnapshots<undefined> {
  takeSnapshot() {
    return undefined;
  }

  restoreSnapshot(_snapshot: undefined) {}
}
