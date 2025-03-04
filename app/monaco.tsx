import { type Monaco } from '@monaco-editor/react';
import type { editor as ed, languages as lang } from 'monaco-editor';
import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useRef,
} from 'react';

import { Node } from '../src/lang/nodes/index.js';
import { parse } from '../src/lang/parser.peggy';
import type { MarkerType } from '../src/lang/types.js';

interface EditorContext {
  initEditor(editor: ed.IStandaloneCodeEditor): void;
  getMarkers(): MarkerType[];
  toggleMarker(lineNumber: number): void;
  getEditor(): ed.IStandaloneCodeEditor | null;
  requireEditor(): ed.IStandaloneCodeEditor;
  getValue(): string;
  setValue(value: string | null): void;
  parseValue(): Node;
  autoLayout(): void;
}

const EditorContext = createContext<EditorContext | null>(null);

const languageConfig: lang.LanguageConfiguration = {
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

const languageDefinition: lang.IMonarchLanguage = {
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
    // builtins
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
    // graphics
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
}

export function useEditor() {
  const editor = useContext(EditorContext);
  if (!editor) {
    throw new Error('Editor not found');
  }
  return editor;
}

export function EditorProvider({ children }: { children: ReactNode }) {
  const editorRef = useRef<ed.IStandaloneCodeEditor | null>(null);
  const decorationsRef = useRef<ed.IEditorDecorationsCollection | null>(null);
  const markersRef = useRef<MarkerType[]>([]);

  const requireEditor = useCallback(() => {
    if (!editorRef.current) {
      throw new Error('Editor not found');
    }
    return editorRef.current;
  }, []);

  const toggleMarker = useCallback((lineNumber: number) => {
    const { current: decorations } = decorationsRef;
    const { current: markers } = markersRef;

    if (!decorations) {
      throw new Error('Decorations not found');
    }

    if (!markers[lineNumber]) {
      markers[lineNumber] = 'breakpoint';
    } else if (markers[lineNumber] === 'breakpoint') {
      markers[lineNumber] = 'snapshot';
    } else {
      delete markers[lineNumber];
    }

    decorations.set(
      markers.reduce<ed.IModelDeltaDecoration[]>((acc, marker, lineNumber) => {
        acc.push({
          range: {
            startLineNumber: lineNumber,
            startColumn: 1,
            endLineNumber: lineNumber,
            endColumn: 1,
          },
          options: {
            isWholeLine: true,
            glyphMarginClassName: marker,
          },
        });
        return acc;
      }, [])
    );
  }, []);

  return (
    <EditorContext.Provider
      value={{
        initEditor(editor) {
          editorRef.current = editor;
          decorationsRef.current = editor.createDecorationsCollection([]);
        },
        getMarkers() {
          return markersRef.current;
        },
        toggleMarker(lineNumber: number) {
          toggleMarker(lineNumber);
        },
        getEditor() {
          return editorRef.current;
        },
        requireEditor() {
          return requireEditor();
        },
        getValue() {
          return requireEditor().getValue() + '\n';
        },
        setValue(value: string | null) {
          requireEditor().setValue(value ?? '\n');
        },
        parseValue() {
          return parse(requireEditor().getValue() + '\n');
        },
        autoLayout() {
          // @ts-expect-error 'auto' is allowed
          editorRef.current?.layout({ width: 'auto', height: 'auto' });
        },
      }}
    >
      {children}
    </EditorContext.Provider>
  );
}
