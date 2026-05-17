import type { Monaco } from '@monaco-editor/react';
import {
  EditorModel,
  type EditorMarker,
  type EditorProgram,
} from '@startlang/lang-core/editor-model';
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

export type EditorHighlightKind = 'current' | 'error';

export interface EditorHighlight {
  readonly kind: EditorHighlightKind;
  readonly lineNumber: number;
}

interface EditorContextValue {
  getValue(): string;
  setValue(value: string, options?: SetEditorValueOptions): void;
  parseProgram(): EditorProgram;
  highlightLine(lineNumber: number | null, kind?: EditorHighlightKind): void;
  toggleMarker(lineNumber: number): void;
  markableLines(): readonly number[];
  source: string;
  markers: readonly EditorMarker[];
  highlightedLine: EditorHighlight | null;
}

const EditorContext = createContext<EditorContextValue | null>(null);

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
    'delete',
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
    'snapshot',
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

function createEditorStore(initialSourceValue: string) {
  const events = new EventTarget();
  const model = new EditorModel(initialSourceValue);

  function subscribe(listener: () => void) {
    events.addEventListener('change', listener);
    return () => {
      events.removeEventListener('change', listener);
    };
  }

  function publish() {
    events.dispatchEvent(new Event('change'));
  }

  function setValue(nextValue: string) {
    if (model.setSource(nextValue)) {
      publish();
    }
  }

  function clearMarkers() {
    if (model.clearMarkers()) {
      publish();
    }
  }

  function toggleMarker(lineNumber: number) {
    try {
      if (model.toggleMarker(lineNumber)) {
        publish();
      }
    } catch {
      // leave invalid source unmarked
    }
  }

  return {
    getSnapshot: () => model.getSnapshot(),
    getValue: () => model.getSource(),
    parseProgram: () => model.parseProgram(),
    markableLines: () => model.markableLines(),
    clearMarkers,
    setValue,
    subscribe,
    toggleMarker,
  };
}

export function useEditor() {
  const context = useContext(EditorContext);
  if (!context) {
    throw new Error('Editor not found');
  }
  return context;
}

export function EditorProvider({ children }: { children: ReactNode }) {
  const [highlightedLine, setHighlightedLine] =
    useState<EditorHighlight | null>(null);
  const { current: editorStore } = useRef(createEditorStore(boxScript));
  const { markers, source } = useSyncExternalStore(
    editorStore.subscribe,
    editorStore.getSnapshot
  );

  const toggleMarker = useCallback(
    (lineNumber: number) => {
      editorStore.toggleMarker(lineNumber);
    },
    [editorStore]
  );

  const markableLines = useCallback(
    () => editorStore.markableLines(),
    [editorStore]
  );

  const getValue = useCallback(() => editorStore.getValue(), [editorStore]);

  const highlightLine = useCallback(
    (lineNumber: number | null, kind: EditorHighlightKind = 'current') => {
      setHighlightedLine(lineNumber !== null ? { kind, lineNumber } : null);
    },
    []
  );

  const parseProgram = useCallback(
    () => editorStore.parseProgram(),
    [editorStore]
  );

  const setValue = useCallback(
    (value: string, options?: SetEditorValueOptions) => {
      if (options?.clearMarkers) {
        editorStore.clearMarkers();
      }
      editorStore.setValue(value);
      setHighlightedLine(null);
    },
    [editorStore]
  );

  const contextValue: EditorContextValue = {
    getValue,
    setValue,
    parseProgram,
    highlightLine,
    toggleMarker,
    markableLines,
    source,
    markers,
    highlightedLine,
  };

  return (
    <EditorContext.Provider value={contextValue}>
      {children}
    </EditorContext.Provider>
  );
}
