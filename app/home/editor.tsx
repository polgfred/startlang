import Monaco, { BeforeMount, OnMount } from '@monaco-editor/react';
import { editor, languages } from 'monaco-editor';
import { RefObject, useCallback, useLayoutEffect } from 'react';

import boxScript from '../../tests/box.start';

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
    'join',
    'keys',
    'len',
    'len',
    'len',
    'log',
    'num',
    'rand',
    'range',
    'range',
    'round',
    'sin',
    'split',
    'sqrt',
    'tan',
    // graphics
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

export default function Editor({
  editorRef,
  showInspector,
  runProgram,
}: {
  editorRef: RefObject<editor.ICodeEditor | null>;
  showInspector: boolean;
  runProgram: () => void;
}) {
  const onBeforeMount: BeforeMount = useCallback((monaco) => {
    monaco.languages.register({ id: 'start' });
    monaco.languages.setLanguageConfiguration('start', languageConfig);
    monaco.languages.setMonarchTokensProvider('start', languageDefinition);
  }, []);

  const onEditorMount: OnMount = useCallback(
    (editor) => {
      editorRef.current = editor;
      editor.onKeyUp((ev) => {
        if (ev.code === 'Enter' && ev.ctrlKey) {
          runProgram();
        }
      });
      editor.focus();
      runProgram();
    },
    [editorRef, runProgram]
  );

  const updateLayout = useCallback(() => {
    if (editorRef.current) {
      // @ts-expect-error 'auto' is allowed
      editorRef.current.layout({ width: 'auto', height: 'auto' });
    }
  }, [editorRef]);

  useLayoutEffect(() => {
    updateLayout();
  }, [showInspector, updateLayout]);

  useLayoutEffect(() => {
    window.addEventListener('resize', updateLayout, false);
    return () => {
      window.removeEventListener('resize', updateLayout, false);
    };
  }, [editorRef, updateLayout]);

  return (
    <Monaco
      defaultValue={boxScript}
      language="start"
      beforeMount={onBeforeMount}
      onMount={onEditorMount}
      options={{
        minimap: { enabled: false },
        scrollBeyondLastLine: false,
      }}
    />
  );
}
