import type { Monaco } from '@monaco-editor/react';
import type { Node } from '@startlang/lang-core/nodes';
import {
  buildMarkerLineMap,
  type MarkerLineMap,
} from '@startlang/lang-core/nodes/map-markers';
import { parse } from '@startlang/lang-core/parser.peggy';
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

type ParseCacheEntry = {
  version: number;
  result:
    | {
        markerLineMap: MarkerLineMap;
        node: Node;
      }
    | Error;
};

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
  const editorRef = useRef<editor.ICodeEditor | null>(null);
  const decorationsRef = useRef<editor.IEditorDecorationsCollection | null>(
    null
  );
  const markersRef = useRef<MarkerType[]>([]);
  const highlightedNodeRef = useRef<Node | null>(null);
  const parseCacheRef = useRef<ParseCacheEntry | null>(null);

  const requireEditor = useCallback(() => {
    if (!editorRef.current) {
      throw new Error('Editor not found');
    }
    return editorRef.current;
  }, []);

  const parseCurrentValue = useCallback(() => {
    const editor = requireEditor();
    const model = editor.getModel();
    const version = model?.getVersionId() ?? 0;
    const cached = parseCacheRef.current;

    if (cached?.version === version) {
      if (cached.result instanceof Error) {
        throw cached.result;
      }
      return cached.result;
    }

    try {
      const node = parse(editor.getValue() + '\n');
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
  }, [requireEditor]);

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

  const resolveMarkerLineNumber = useCallback(
    (lineNumber: number) => {
      const { markerLineMap } = parseCurrentValue();
      return markerLineMap.resolve(lineNumber)?.lineNumber ?? null;
    },
    [parseCurrentValue]
  );

  const cycleMarker = useCallback(
    (lineNumber: number) => {
      const markers = markersRef.current;

      if (!markers[lineNumber]) {
        markers[lineNumber] = 'breakpoint';
      } else if (markers[lineNumber] === 'breakpoint') {
        markers[lineNumber] = 'snapshot';
      } else {
        // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
        delete markers[lineNumber];
      }

      updateDecorations();
    },
    [updateDecorations]
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
        return parseCurrentValue().node;
      },
      setValue(value) {
        requireEditor().setValue(value ?? '');
      },
      requireEditor,
      toggleMarker,
    }),
    [parseCurrentValue, requireEditor, toggleMarker]
  );

  return (
    <EditorContext.Provider value={value}>{children}</EditorContext.Provider>
  );
}
