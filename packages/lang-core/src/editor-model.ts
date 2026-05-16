import {
  buildMarkerLineMap,
  type MarkerLineMap,
  type MarkerMap,
} from './editor-markers.js';
import { parse } from './parser.peggy';
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

type ParseCacheEntry = {
  version: number;
  result:
    | {
        markerLineMap: MarkerLineMap;
        program: Program;
      }
    | Error;
};

export class EditorModel {
  private version = 0;
  private readonly markers: MarkerType[] = [];
  private snapshot: EditorSnapshot;
  private parseCache: ParseCacheEntry | null = null;

  constructor(private source: string = '') {
    this.snapshot = this.readSnapshot();
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
    if (this.markers[lineNumber]) {
      this.cycleMarker(lineNumber);
      return true;
    }

    const resolvedLineNumber = this.resolveMarkerLine(lineNumber);
    if (resolvedLineNumber === null) {
      return false;
    }

    this.cycleMarker(resolvedLineNumber);
    return true;
  }

  private resolveMarkerLine(lineNumber: number): number | null {
    try {
      const { markerLineMap } = this.parseCurrentSource();
      return markerLineMap.resolve(lineNumber)?.lineNumber ?? null;
    } catch {
      return null;
    }
  }

  parseProgram(): EditorProgram {
    const { markerLineMap, program } = this.parseCurrentSource();
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

  private parseCurrentSource() {
    const cached = this.parseCache;

    if (cached?.version === this.version) {
      if (cached.result instanceof Error) {
        throw cached.result;
      }
      return cached.result;
    }

    try {
      const program = parse(this.source + '\n');
      const result = {
        markerLineMap: buildMarkerLineMap(program),
        program,
      };
      this.parseCache = { version: this.version, result };
      return result;
    } catch (err) {
      const result = err instanceof Error ? err : new Error(String(err));
      this.parseCache = { version: this.version, result };
      throw result;
    }
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
