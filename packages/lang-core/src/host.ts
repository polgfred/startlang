export interface SupportsSnapshots<T = unknown> {
  takeSnapshot(): T;
  restoreSnapshot(snapshot: T): void;
}

export interface PresentationHost<TSnapshot = unknown>
  extends SupportsSnapshots<TSnapshot> {
  restoreOriginalSettings(): void;
  clearDisplay(): void;
  clearOutputBuffer(): void;
  setConfiguration(name: string, value: unknown): void;
}

export type NullPresentationSnapshot = Record<string, never>;

export class NullPresentationHost
  implements PresentationHost<NullPresentationSnapshot>
{
  restoreOriginalSettings() {}

  clearDisplay() {}

  clearOutputBuffer() {}

  setConfiguration(name: string, value: unknown) {
    throw new Error(`could not set presentation configuration option: ${name}`);
  }

  takeSnapshot(): NullPresentationSnapshot {
    return {};
  }

  restoreSnapshot(snapshot: NullPresentationSnapshot) {}
}
