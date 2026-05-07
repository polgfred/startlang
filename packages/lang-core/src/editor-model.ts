import {
  buildMarkerLineMap,
  type MarkerLineMap,
  type MarkerMap,
} from './editor-markers.js';
import type { Node } from './nodes/index.js';
import { parse } from './parser.peggy';
import type { MarkerType } from './types.js';

export interface EditorMarker {
  readonly lineNumber: number;
  readonly marker: MarkerType;
}

export interface EditorSnapshot {
  readonly markers: readonly EditorMarker[];
  readonly markerVersion: number;
  readonly sourceValue: string;
  readonly sourceVersion: number;
}

export interface EditorProgram {
  readonly markerMap: MarkerMap;
  readonly node: Node;
}

type ParseCacheEntry = {
  version: number;
  result:
    | {
        markerLineMap: MarkerLineMap;
        node: Node;
      }
    | Error;
};

export class EditorModel {
  private readonly markers: MarkerType[] = [];
  private markerVersion = 0;
  private sourceVersion = 0;
  private snapshot: EditorSnapshot;
  private parseCache: ParseCacheEntry | null = null;

  constructor(private sourceValue: string = '') {
    this.snapshot = this.readSnapshot();
  }

  getSnapshot() {
    return this.snapshot;
  }

  getSource() {
    return this.sourceValue;
  }

  setSource(nextValue: string) {
    if (nextValue === this.sourceValue) {
      return false;
    }

    this.sourceValue = nextValue;
    this.sourceVersion += 1;
    this.snapshot = this.readSnapshot();
    return true;
  }

  clearMarkers() {
    if (!this.markers.some(Boolean)) {
      return false;
    }

    this.markers.length = 0;
    this.markerVersion += 1;
    this.snapshot = this.readSnapshot();
    return true;
  }

  toggleMarker(lineNumber: number) {
    if (this.markers[lineNumber]) {
      this.cycleMarker(lineNumber);
      return true;
    }

    const resolvedLineNumber = this.resolveMarkerLineNumber(lineNumber);
    if (resolvedLineNumber === null) {
      return false;
    }

    this.cycleMarker(resolvedLineNumber);
    return true;
  }

  parseProgram(): EditorProgram {
    const { markerLineMap, node } = this.parseCurrentSource();
    return {
      markerMap: markerLineMap.mapMarkers(
        (lineNumber) => this.markers[lineNumber]
      ),
      node,
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

    this.markerVersion += 1;
    this.snapshot = this.readSnapshot();
  }

  private parseCurrentSource() {
    const cached = this.parseCache;

    if (cached?.version === this.sourceVersion) {
      if (cached.result instanceof Error) {
        throw cached.result;
      }
      return cached.result;
    }

    try {
      const node = parse(this.sourceValue + '\n');
      const result = {
        markerLineMap: buildMarkerLineMap(node),
        node,
      };
      this.parseCache = { version: this.sourceVersion, result };
      return result;
    } catch (err) {
      const result = err instanceof Error ? err : new Error(String(err));
      this.parseCache = { version: this.sourceVersion, result };
      throw result;
    }
  }

  private resolveMarkerLineNumber(lineNumber: number) {
    const { markerLineMap } = this.parseCurrentSource();
    return markerLineMap.resolve(lineNumber)?.lineNumber ?? null;
  }

  private readSnapshot(): EditorSnapshot {
    const markers: EditorMarker[] = [];

    this.markers.forEach((marker, lineNumber) => {
      if (marker) {
        markers.push({ lineNumber, marker });
      }
    });

    return {
      markers,
      markerVersion: this.markerVersion,
      sourceValue: this.sourceValue,
      sourceVersion: this.sourceVersion,
    };
  }
}
