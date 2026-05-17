import { buildMarkerLineMap, type MarkerLineMap } from './editor-markers.js';
import { parse } from './parser.peggy';
import { Program } from './program.js';

export interface ParseResult {
  readonly program: Program;
  readonly markerLineMap: MarkerLineMap;
}

// Owns the parse cache for an EditorModel. Phase 1 of the async parse pipeline
// (see docs/async-parse-pipeline.md) — `schedule` runs the parse synchronously;
// later phases can defer or move the parse off-thread without changing callers.
export class ParseScheduler {
  private version: number;
  private result: ParseResult | Error;

  constructor(version: number, source: string) {
    this.version = version;
    this.result = parseSource(source);
  }

  schedule(version: number, source: string): void {
    if (this.version === version) {
      return;
    }
    this.version = version;
    this.result = parseSource(source);
  }

  current(): ParseResult {
    if (this.result instanceof Error) {
      throw this.result;
    }
    return this.result;
  }
}

function parseSource(source: string): ParseResult | Error {
  try {
    const program = parse(source + '\n');
    return {
      program,
      markerLineMap: buildMarkerLineMap(program),
    };
  } catch (err) {
    return err instanceof Error ? err : new Error(String(err));
  }
}
