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
  readonly markerMap: MarkerMap;
  readonly program: Program;
}

export class EditorModel {
  private version = 0;
  private readonly markers: MarkerType[] = [];
  private snapshot: EditorSnapshot;
  private readonly scheduler: ParseScheduler;

  constructor(private source: string = '') {
    this.snapshot = this.readSnapshot();
    this.scheduler = new ParseScheduler(this.version, this.source);
  }

  getSnapshot() {
    return this.snapshot;
  }

  getSource() {
    return this.source;
  }

  setSource(nextValue: string) {
    if (nextValue === this.source) {
      return false;
    }

    this.version += 1;
    this.source = nextValue;
    this.snapshot = this.readSnapshot();
    this.scheduler.schedule(this.version, this.source);
    return true;
  }

  clearMarkers() {
    if (!this.markers.some(Boolean)) {
      return false;
    }

    this.markers.length = 0;
    this.snapshot = this.readSnapshot();
    return true;
  }

  toggleMarker(lineNumber: number) {
    if (this.markers[lineNumber] || this.isMarkable(lineNumber)) {
      this.cycleMarker(lineNumber);
      return true;
    }
    return false;
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
    const { markerLineMap, program } = this.scheduler.current();
    return {
      markerMap: markerLineMap.mapMarkers(
        (lineNumber) => this.markers[lineNumber]
      ),
      program,
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

    this.snapshot = this.readSnapshot();
  }

  private readSnapshot(): EditorSnapshot {
    const markers: EditorMarker[] = [];

    this.markers.forEach((marker, lineNumber) => {
      if (marker) {
        markers.push({ lineNumber, marker });
      }
    });

    return {
      version: this.version,
      source: this.source,
      markers,
    };
  }
}
