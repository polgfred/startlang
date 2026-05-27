import { buildMarkerLineMap, type MarkerLineMap } from './editor-markers.js';
import { parse } from './parser.peggy';
import type { Program } from './program.js';

export interface ParseResult {
  readonly program: Program;
  readonly markerLineMap: MarkerLineMap;
}

const DEBOUNCE_MS = 200;

export class ParseScheduler {
  private version: number;
  private result: ParseResult | Error;
  private pending: {
    version: number;
    source: string;
    timer: ReturnType<typeof setTimeout>;
  } | null = null;
  private readonly onCommit: () => void;

  constructor(
    version: number,
    source: string,
    onCommit: () => void = () => {}
  ) {
    this.version = version;
    this.result = parseSource(source);
    this.onCommit = onCommit;
  }

  schedule(version: number, source: string): void {
    if (this.pending !== null) {
      clearTimeout(this.pending.timer);
      this.pending = null;
    }
    if (this.version === version) {
      return;
    }
    const timer = setTimeout(() => {
      this.commit(version, source);
    }, DEBOUNCE_MS);
    this.pending = { version, source, timer };
  }

  flush(): void {
    if (this.pending !== null) {
      clearTimeout(this.pending.timer);
      this.commit(this.pending.version, this.pending.source);
    }
  }

  current(): ParseResult {
    if (this.result instanceof Error) {
      throw this.result;
    }
    return this.result;
  }

  private commit(version: number, source: string): void {
    this.pending = null;
    this.version = version;
    this.result = parseSource(source);
    this.onCommit();
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
