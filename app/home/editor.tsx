import Monaco, { BeforeMount, OnMount } from '@monaco-editor/react';
import { type editor } from 'monaco-editor';
import { RefObject, useCallback } from 'react';

import boxScript from '../../tests/box.start';

export default function Editor({
  editorRef,
}: {
  editorRef: RefObject<editor.ICodeEditor | null>;
}) {
  const onBeforeMount: BeforeMount = useCallback((monaco) => {
    monaco.languages.register({ id: 'start' });
    monaco.languages.setLanguageConfiguration('start', {
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
    });
    monaco.languages.setMonarchTokensProvider('start', {
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
    });
  }, []);

  const onEditorMount: OnMount = useCallback(
    (editor) => {
      editorRef.current = editor;
      editor.focus();
    },
    [editorRef]
  );

  return (
    <Monaco
      defaultValue={boxScript}
      language="start"
      beforeMount={onBeforeMount}
      onMount={onEditorMount}
      options={{
        minimap: { enabled: false },
      }}
    />
  );
}
