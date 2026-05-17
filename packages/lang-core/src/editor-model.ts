import type { MarkerMap } from './editor-markers.js';
import { ParseScheduler } from './parse-scheduler.js';
import { Program } from './program.js';
import type { MarkerType } from './types.js';

export interface EditorMarker {
  readonly lineNumber: number;
  readonly marker: MarkerType;
}

export interface EditorSnapshot {
  readonly version: number;
  readonly source: string;
  readonly markers: readonly EditorMarker[];
}

export interface EditorProgram {
  readonly program: Program;
  readonly markerMap: MarkerMap;
}

export class EditorModel {
  private version = 0;
  private source: string;
  private cachedSnapshot: EditorSnapshot | null = null;
  // Sparse array to track marked lines.
  private markers: MarkerType[] = [];
  private readonly scheduler: ParseScheduler;
  private readonly notify: () => void;

  constructor(source: string = '', notify: () => void = () => {}) {
    this.source = source;
    this.notify = notify;
    this.scheduler = new ParseScheduler(this.version, this.source, () =>
      this.afterParseCommit()
    );
  }

  getSnapshot(): EditorSnapshot {
    if (this.cachedSnapshot === null) {
      const markers: EditorMarker[] = [];
      this.markers.forEach((marker, lineNumber) => {
        markers.push({ lineNumber, marker });
      });
      this.cachedSnapshot = {
        version: this.version,
        source: this.source,
        markers,
      };
    }
    return this.cachedSnapshot;
  }

  getSource(): string {
    return this.source;
  }

  setSource(nextValue: string): boolean {
    if (nextValue === this.source) {
      return false;
    }
    this.version += 1;
    this.source = nextValue;
    this.scheduler.schedule(this.version, this.source);
    this.publish();
    return true;
  }

  clearMarkers(): boolean {
    if (!this.markers.some(Boolean)) {
      return false;
    }
    this.markers = [];
    this.publish();
    return true;
  }

  toggleMarker(lineNumber: number): boolean {
    if (this.markers[lineNumber] || this.isMarkable(lineNumber)) {
      this.cycleMarker(lineNumber);
      this.publish();
      return true;
    }
    return false;
  }

  // Apply a line-count delta from an editor edit
  // Best-effort: the parse-time validation in `afterParseCommit` cleans up
  // anything that ends up on a non-statement line.
  shiftMarkers(startLine: number, endLine: number, lineDelta: number): void {
    if (lineDelta === 0) {
      return;
    }
    const next: MarkerType[] = [];
    let changed = false;
    this.markers.forEach((marker, lineNumber) => {
      if (lineNumber <= startLine) {
        next[lineNumber] = marker;
      } else if (lineNumber <= endLine) {
        // Line is inside the replaced span — drop.
        changed = true;
      } else {
        next[lineNumber + lineDelta] = marker;
        changed = true;
      }
    });
    if (changed) {
      this.markers = next;
      this.publish();
    }
  }

  isMarkable(lineNumber: number): boolean {
    try {
      return this.scheduler.current().markerLineMap.isMarkable(lineNumber);
    } catch {
      return false;
    }
  }

  markableLines(): readonly number[] {
    try {
      return this.scheduler.current().markerLineMap.markableLines();
    } catch {
      return [];
    }
  }

  parseProgram(): EditorProgram {
    this.scheduler.flush();
    const { program, markerLineMap } = this.scheduler.current();
    return {
      program,
      markerMap: markerLineMap.mapMarkers(
        (lineNumber) => this.markers[lineNumber]
      ),
    };
  }

  private cycleMarker(lineNumber: number) {
    if (!this.markers[lineNumber]) {
      this.markers[lineNumber] = 'breakpoint';
    } else if (this.markers[lineNumber] === 'breakpoint') {
      this.markers[lineNumber] = 'snapshot';
    } else {
      // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
      delete this.markers[lineNumber];
    }
  }

  private afterParseCommit(): void {
    try {
      const lineMap = this.scheduler.current().markerLineMap;
      let changed = false;
      this.markers.forEach((_marker, lineNumber) => {
        if (!lineMap.isMarkable(lineNumber)) {
          // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
          delete this.markers[lineNumber];
          changed = true;
        }
      });
      if (changed) {
        this.publish();
      }
    } catch {
      return; // current parse failed; don't validate
    }
  }

  private publish(): void {
    this.cachedSnapshot = null;
    this.notify();
  }
}
