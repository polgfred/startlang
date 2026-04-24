export interface SupportsSnapshots<T = unknown> {
  takeSnapshot(): T;
  restoreSnapshot(snapshot: T): void;
}

export type RuntimeEnvironment = object;

export type PresentationViewMode = 'graphics' | 'text';

export interface PresentationHost<TSnapshot = unknown>
  extends SupportsSnapshots<TSnapshot> {
  readonly viewMode: PresentationViewMode;

  restoreOriginalSettings(): void;
  setViewMode(mode: PresentationViewMode): void;
  clearDisplay(): void;
  clearOutputBuffer(): void;
  setConfiguration(name: string, value: unknown): void;
}

export interface NullPresentationSnapshot {
  viewMode: PresentationViewMode;
}

export class NullPresentationHost
  implements PresentationHost<NullPresentationSnapshot>
{
  viewMode: PresentationViewMode = 'text';

  restoreOriginalSettings() {
    this.viewMode = 'text';
  }

  setViewMode(mode: PresentationViewMode) {
    this.viewMode = mode;
  }

  clearDisplay() {}

  clearOutputBuffer() {}

  setConfiguration(name: string, value: unknown) {
    if (name === 'mode') {
      if (value !== 'graphics' && value !== 'text') {
        throw new Error(`invalid mode: ${value}`);
      }
      this.setViewMode(value);
      return;
    }

    throw new Error(`could not set presentation configuration option: ${name}`);
  }

  takeSnapshot(): NullPresentationSnapshot {
    return {
      viewMode: this.viewMode,
    };
  }

  restoreSnapshot(snapshot: NullPresentationSnapshot) {
    this.viewMode = snapshot.viewMode;
  }
}
