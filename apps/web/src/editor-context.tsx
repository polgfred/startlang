import type { Monaco } from '@monaco-editor/react';
import type { Node } from '@startlang/lang-core/nodes';
import {
  buildMarkerLineMap,
  type MarkerLineMap,
} from '@startlang/lang-core/nodes/map-markers';
import { parse } from '@startlang/lang-core/parser.peggy';
import type { MarkerType } from '@startlang/lang-core/types';
import type { languages } from 'monaco-editor';
import {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from 'react';

import boxScript from '../tests/box.start';

interface SetEditorValueOptions {
  clearMarkers?: boolean;
}

interface EditorContextValue {
  getValue(): string;
  setValue(value: string, options?: SetEditorValueOptions): void;
  getMarkers(): MarkerType[];
  highlightNode(node: Node | null): void;
  parseValue(): Node;
  highlightedNode: Node | null;
  markers: MarkerType[];
  markerVersion: number;
  sourceValue: string;
  sourceVersion: number;
  toggleMarker(lineNumber: number): void;
}

const EditorContext = createContext<EditorContextValue | null>(null);

type ParseCacheEntry = {
  version: number;
  result:
    | {
        markerLineMap: MarkerLineMap;
        node: Node;
      }
    | Error;
};

interface EditorSnapshot {
  markers: MarkerType[];
  markerVersion: number;
  sourceValue: string;
  sourceVersion: number;
}

function createEditorStore(initialSourceValue: string) {
  const events = new EventTarget();
  const markers: MarkerType[] = [];
  let markerVersion = 0;
  let sourceValue = initialSourceValue;
  let sourceVersion = 0;
  let snapshot: EditorSnapshot = {
    markers,
    markerVersion,
    sourceValue,
    sourceVersion,
  };

  function subscribe(listener: () => void) {
    events.addEventListener('change', listener);
    return () => {
      events.removeEventListener('change', listener);
    };
  }

  function publish() {
    snapshot = { markers, markerVersion, sourceValue, sourceVersion };
    events.dispatchEvent(new Event('change'));
  }

  function setValue(nextValue: string) {
    if (nextValue === sourceValue) {
      return;
    }
    sourceValue = nextValue;
    sourceVersion += 1;
    publish();
  }

  function clearMarkers() {
    markers.length = 0;
    markerVersion += 1;
    publish();
  }

  function cycleMarker(lineNumber: number) {
    if (!markers[lineNumber]) {
      markers[lineNumber] = 'breakpoint';
    } else if (markers[lineNumber] === 'breakpoint') {
      markers[lineNumber] = 'snapshot';
    } else {
      // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
      delete markers[lineNumber];
    }
    markerVersion += 1;
    publish();
  }

  return {
    getSnapshot: () => snapshot,
    getMarkers: () => markers,
    getValue: () => sourceValue,
    getVersion: () => sourceVersion,
    clearMarkers,
    cycleMarker,
    setValue,
    subscribe,
  };
}

const languageConfig: languages.LanguageConfiguration = {
  comments: {
    lineComment: ';',
  },
  brackets: [
    ['(', ')'],
    ['[', ']'],
    ['{', '}'],
  ],
  autoClosingPairs: [
    { open: '[', close: ']', notIn: ['string'] },
    { open: '(', close: ')', notIn: ['string'] },
    { open: '{', close: '}', notIn: ['string'] },
    { open: '"', close: '"', notIn: ['string'] },
  ],
  folding: {
    markers: {
      start: /^\s*(do|then|else)\b/,
      end: /^\s*end\b/,
    },
  },
};

const languageDefinition: languages.IMonarchLanguage = {
  defaultToken: '',
  keywords: [
    'and',
    'begin',
    'break',
    'by',
    'do',
    'else',
    'end',
    'exit',
    'for',
    'from',
    'if',
    'in',
    'let',
    'next',
    'not',
    'or',
    'repeat',
    'return',
    'set',
    'then',
    'to',
    'while',
  ],
  functions: [
    'abs',
    'acos',
    'asin',
    'atan',
    'bitand',
    'bitnot',
    'bitor',
    'bitxor',
    'cbrt',
    'cos',
    'exp',
    'format',
    'input',
    'join',
    'keys',
    'len',
    'log',
    'num',
    'rand',
    'range',
    'round',
    'sin',
    'snapshot',
    'split',
    'sqrt',
    'tan',
    'circle',
    'clear',
    'color',
    'ellipse',
    'header',
    'heading',
    'line',
    'polygon',
    'print',
    'rect',
    'row',
    'stack',
    'table',
    'text',
  ],
  tokenizer: {
    root: [
      [
        /[a-zA-Z_][\w]*/,
        {
          cases: {
            '@keywords': 'keyword',
            '@functions': 'support.function',
            '@default': 'identifier',
          },
        },
      ],
      [/[ \t\r\n]+/, 'white'],
      [/;.*$/, 'comment'],
      [/[,+\-*/%!=<>&|~]/, 'keyword.operator'],
      [/\d+\.\d+([eE][-+]?\d+)?/, 'number.float'],
      [/\d+/, 'number'],
      [/"/, 'string', '@string'],
    ],
    string: [
      [/""/, 'string'],
      [/{{/, 'string'],
      [/}}/, 'string'],
      [/{}/, 'string'],
      [/{/, { token: 'string', next: '@interp' }],
      [/[^"{]+/, 'string'],
      [/"/, 'string', '@pop'],
    ],
    interp: [[/}/, 'string', '@pop'], { include: 'root' }],
  },
};

export function setupLanguage(monaco: Monaco) {
  monaco.languages.register({ id: 'start' });
  monaco.languages.setLanguageConfiguration('start', languageConfig);
  monaco.languages.setMonarchTokensProvider('start', languageDefinition);
  monaco.editor.defineTheme('start-light', {
    base: 'vs',
    inherit: true,
    rules: [
      { token: 'support.function', foreground: '795E26' },
      { token: 'identifier', foreground: '001080' },
    ],
    colors: {},
  });
}

export function useEditor() {
  const context = useContext(EditorContext);
  if (!context) {
    throw new Error('Editor not found');
  }
  return context;
}

export function EditorProvider({ children }: { children: ReactNode }) {
  const [highlightedNode, setHighlightedNode] = useState<Node | null>(null);
  const { current: editorStore } = useRef(createEditorStore(boxScript));
  const { markers, markerVersion, sourceValue, sourceVersion } =
    useSyncExternalStore(editorStore.subscribe, editorStore.getSnapshot);
  const parseCacheRef = useRef<ParseCacheEntry | null>(null);

  const parseCurrentValue = useCallback(() => {
    const version = editorStore.getVersion();
    const cached = parseCacheRef.current;

    if (cached?.version === version) {
      if (cached.result instanceof Error) {
        throw cached.result;
      }
      return cached.result;
    }

    try {
      const node = parse(editorStore.getValue() + '\n');
      const result = {
        markerLineMap: buildMarkerLineMap(node),
        node,
      };
      parseCacheRef.current = { version, result };
      return result;
    } catch (err) {
      const result = err instanceof Error ? err : new Error(String(err));
      parseCacheRef.current = { version, result };
      throw result;
    }
  }, [editorStore]);

  const resolveMarkerLineNumber = useCallback(
    (lineNumber: number) => {
      const { markerLineMap } = parseCurrentValue();
      return markerLineMap.resolve(lineNumber)?.lineNumber ?? null;
    },
    [parseCurrentValue]
  );

  const toggleMarker = useCallback(
    (lineNumber: number) => {
      const markers = editorStore.getMarkers();

      if (markers[lineNumber]) {
        editorStore.cycleMarker(lineNumber);
        return;
      }

      try {
        const resolvedLineNumber = resolveMarkerLineNumber(lineNumber);
        if (resolvedLineNumber !== null) {
          editorStore.cycleMarker(resolvedLineNumber);
        }
      } catch {
        // leave invalid source unmarked
      }
    },
    [editorStore, resolveMarkerLineNumber]
  );

  const getMarkers = useCallback(() => editorStore.getMarkers(), [editorStore]);

  const getValue = useCallback(() => editorStore.getValue(), [editorStore]);

  const highlightNode = useCallback((node: Node | null) => {
    setHighlightedNode(node);
  }, []);

  const parseValue = useCallback(
    () => parseCurrentValue().node,
    [parseCurrentValue]
  );

  const setValue = useCallback(
    (value: string, options?: SetEditorValueOptions) => {
      if (options?.clearMarkers) {
        editorStore.clearMarkers();
      }
      editorStore.setValue(value);
    },
    [editorStore]
  );

  const contextValue: EditorContextValue = {
    getMarkers,
    getValue,
    highlightedNode,
    highlightNode,
    markers,
    markerVersion,
    parseValue,
    setValue,
    sourceValue,
    sourceVersion,
    toggleMarker,
  };

  return (
    <EditorContext.Provider value={contextValue}>
      {children}
    </EditorContext.Provider>
  );
}
