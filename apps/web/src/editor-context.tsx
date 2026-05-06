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
  useMemo,
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
  sourceValue: string;
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

function createEditorSourceStore(initialValue: string) {
  const listeners = new Set<() => void>();
  let value = initialValue;
  let version = 0;

  function subscribe(listener: () => void) {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  }

  function publish() {
    listeners.forEach((listener) => {
      listener();
    });
  }

  function getValue() {
    return value;
  }

  function getVersion() {
    return version;
  }

  function setValue(nextValue: string) {
    if (nextValue === value) {
      return;
    }

    value = nextValue;
    version += 1;
    publish();
  }

  return {
    getSnapshot: getValue,
    getValue,
    getVersion,
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
  const [markers, setMarkersState] = useState<MarkerType[]>([]);
  const { current: sourceStore } = useRef(createEditorSourceStore(boxScript));
  const sourceValue = useSyncExternalStore(
    sourceStore.subscribe,
    sourceStore.getSnapshot
  );
  const markersRef = useRef(markers);
  const parseCacheRef = useRef<ParseCacheEntry | null>(null);

  const replaceMarkers = useCallback((nextMarkers: MarkerType[]) => {
    markersRef.current = nextMarkers;
    setMarkersState(nextMarkers);
  }, []);

  const parseCurrentValue = useCallback(() => {
    const version = sourceStore.getVersion();
    const cached = parseCacheRef.current;

    if (cached?.version === version) {
      if (cached.result instanceof Error) {
        throw cached.result;
      }
      return cached.result;
    }

    try {
      const node = parse(sourceStore.getValue() + '\n');
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
  }, [sourceStore]);

  const resolveMarkerLineNumber = useCallback(
    (lineNumber: number) => {
      const { markerLineMap } = parseCurrentValue();
      return markerLineMap.resolve(lineNumber)?.lineNumber ?? null;
    },
    [parseCurrentValue]
  );

  const cycleMarker = useCallback(
    (lineNumber: number) => {
      const nextMarkers = markersRef.current.slice();

      if (!nextMarkers[lineNumber]) {
        nextMarkers[lineNumber] = 'breakpoint';
      } else if (nextMarkers[lineNumber] === 'breakpoint') {
        nextMarkers[lineNumber] = 'snapshot';
      } else {
        // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
        delete nextMarkers[lineNumber];
      }

      replaceMarkers(nextMarkers);
    },
    [replaceMarkers]
  );

  const toggleMarker = useCallback(
    (lineNumber: number) => {
      const markers = markersRef.current;

      if (markers[lineNumber]) {
        cycleMarker(lineNumber);
        return;
      }

      try {
        const resolvedLineNumber = resolveMarkerLineNumber(lineNumber);
        if (resolvedLineNumber !== null) {
          cycleMarker(resolvedLineNumber);
        }
      } catch {
        // leave invalid source unmarked
      }
    },
    [cycleMarker, resolveMarkerLineNumber]
  );

  const getMarkers = useCallback(() => markersRef.current, []);

  const getValue = useCallback(() => sourceStore.getValue(), [sourceStore]);

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
        replaceMarkers([]);
      }
      sourceStore.setValue(value);
    },
    [replaceMarkers, sourceStore]
  );

  const contextValue = useMemo<EditorContextValue>(
    () => ({
      getMarkers,
      getValue,
      highlightedNode,
      highlightNode,
      markers,
      parseValue,
      setValue,
      sourceValue,
      toggleMarker,
    }),
    [
      getMarkers,
      getValue,
      highlightedNode,
      highlightNode,
      markers,
      parseValue,
      setValue,
      sourceValue,
      toggleMarker,
    ]
  );

  return (
    <EditorContext.Provider value={contextValue}>
      {children}
    </EditorContext.Provider>
  );
}
