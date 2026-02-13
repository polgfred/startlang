declare module '*.peggy' {
  import { Node } from './lang/nodes/base.js';
  export function parse(source: string): Node;
}

declare module '*.start' {
  const source: string;
  export default source;
}

type UncheckedProps<T> = {
  [K in keyof T]?: unknown;
};

interface StartLangDesktopApi {
  isDesktop: true;
  engine: {
    run(source: string): Promise<import('./desktop/types.js').EngineRunResult>;
    moveToSnapshot(
      index: number
    ): Promise<import('./desktop/types.js').EngineRunResult>;
    exportTrace(): Promise<import('./desktop/types.js').TraceBundle>;
  };
  files: {
    open(): Promise<{ filePath: string; content: string } | null>;
    readRecent(filePath: string): Promise<{ filePath: string; content: string }>;
    save(filePath: string, content: string): Promise<{ filePath: string }>;
    saveAs(content: string): Promise<{ filePath: string } | null>;
    listRecent(): Promise<string[]>;
    saveTraceBundle(json: string): Promise<{ filePath: string } | null>;
  };
}

interface Window {
  startlangDesktop?: StartLangDesktopApi;
}
