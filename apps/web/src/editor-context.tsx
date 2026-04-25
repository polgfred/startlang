import type { Monaco } from '@monaco-editor/react';
import { parse } from '@startlang/lang-core/parser.peggy';
import type { Node } from '@startlang/lang-core/nodes';
import type { MarkerType } from '@startlang/lang-core/types';
import type { editor, languages } from 'monaco-editor';
import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useMemo,
  useRef,
} from 'react';

interface EditorContextValue {
  autoLayout(): void;
  getMarkers(): MarkerType[];
  getValue(): string;
  highlightNode(node: Node | null): void;
  initEditor(editor: editor.ICodeEditor): void;
  parseValue(): Node;
  requireEditor(): editor.ICodeEditor;
  setValue(value: string | null): void;
  toggleMarker(lineNumber: number): void;
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
    'align',
    'anchor',
    'circle',
    'color',
    'ellipse',
    'fill',
    'font',
    'line',
    'polygon',
    'opacity',
    'rect',
    'rotate',
    'scale',
    'stroke',
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
  const context = useContext(EditorContext);
  if (!context) {
    throw new Error('Editor not found');
  }
  return context;
}

export function EditorProvider({ children }: { children: ReactNode }) {
  const editorRef = useRef<editor.ICodeEditor | null>(null);
  const decorationsRef =
    useRef<editor.IEditorDecorationsCollection | null>(null);
  const markersRef = useRef<MarkerType[]>([]);
  const highlightedNodeRef = useRef<Node | null>(null);

  const requireEditor = useCallback(() => {
    if (!editorRef.current) {
      throw new Error('Editor not found');
    }
    return editorRef.current;
  }, []);

  const updateDecorations = useCallback(() => {
    const decorations = decorationsRef.current;
    if (!decorations) {
      return;
    }

    const nextDecorations: editor.IModelDeltaDecoration[] = [];
    const highlightedNode = highlightedNodeRef.current;
    if (highlightedNode) {
      nextDecorations.push({
        range: {
          startLineNumber: highlightedNode.location.start.line,
          startColumn: highlightedNode.location.start.column,
          endLineNumber: highlightedNode.location.end.line,
          endColumn: highlightedNode.location.end.column,
        },
        options: {
          isWholeLine: true,
          linesDecorationsClassName: 'start-highlight',
        },
      });
    }

    markersRef.current.forEach((marker, lineNumber) => {
      if (!marker) {
        return;
      }
      const label = marker === 'breakpoint' ? 'Breakpoint' : 'Snapshot';
      nextDecorations.push({
        range: {
          startLineNumber: lineNumber,
          startColumn: 1,
          endLineNumber: lineNumber,
          endColumn: 1,
        },
        options: {
          isWholeLine: true,
          glyphMarginClassName: `start-${marker}`,
          glyphMarginHoverMessage: {
            value: `${label}: click to ${
              marker === 'breakpoint' ? 'change to snapshot' : 'clear'
            }.`,
          },
        },
      });
    });

    decorations.set(nextDecorations);
  }, []);

  const value = useMemo<EditorContextValue>(
    () => ({
      autoLayout() {
        // @ts-expect-error 'auto' is allowed
        editorRef.current?.layout({ width: 'auto', height: 'auto' });
      },
      getMarkers() {
        return markersRef.current;
      },
      getValue() {
        return requireEditor().getValue() + '\n';
      },
      highlightNode(node) {
        highlightedNodeRef.current = node;
        updateDecorations();
      },
      initEditor(editor) {
        editorRef.current = editor;
        decorationsRef.current = editor.createDecorationsCollection([]);
      },
      parseValue() {
        return parse(requireEditor().getValue() + '\n');
      },
      requireEditor,
      setValue(value) {
        requireEditor().setValue(value ?? '');
      },
      toggleMarker(lineNumber) {
        const markers = markersRef.current;
        if (!markers[lineNumber]) {
          markers[lineNumber] = 'breakpoint';
        } else if (markers[lineNumber] === 'breakpoint') {
          markers[lineNumber] = 'snapshot';
        } else {
          delete markers[lineNumber];
        }
        updateDecorations();
      },
    }),
    [requireEditor, updateDecorations]
  );

  return (
    <EditorContext.Provider value={value}>{children}</EditorContext.Provider>
  );
}
