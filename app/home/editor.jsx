'use client';

import Monaco from '@monaco-editor/react';
import { useCallback } from 'react';

import { parse } from '../../src/lang/parser.peggy';
import boxScript from '../../tests/box.start';

export default function Editor({ setParser }) {
  const onBeforeMount = useCallback((monaco) => {
    monaco.languages.register({ id: 'start' });
    monaco.languages.setLanguageConfiguration('start', {
      comments: {
        lineComment: ';',
      },
      brackets: [
        ['(', ')'],
        ['[', ']'],
      ],
      autoClosingPairs: [
        { open: '[', close: ']', notIn: ['string'] },
        { open: '(', close: ')', notIn: ['string'] },
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
      ignoreCase: true,
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
        'local',
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
        'add',
        'asin',
        'atan',
        'avg',
        'cbrt',
        'ceil',
        'clamp',
        'clear',
        'cos',
        'copy',
        'cos',
        'diff',
        'endof',
        'exp',
        'first',
        'floor',
        'input',
        'insert',
        'join',
        'keys',
        'last',
        'len',
        'list',
        'log',
        'lower',
        'max',
        'min',
        'num',
        'part',
        'pow',
        'print',
        'put',
        'rand',
        'remove',
        'replace',
        'reverse',
        'round',
        'rsort',
        'shuffle',
        'sign',
        'sin',
        'sleep',
        'sort',
        'split',
        'sqrt',
        'startof',
        'str',
        'sub',
        'sum',
        'swap',
        'table',
        'tan',
        'time',
        'upper',
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
        'polyline',
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
          [/``/, 'string'],
          [/`/, { token: 'string', next: '@interp' }],
          [/[^"`]+/, 'string'],
          [/"/, 'string', '@pop'],
        ],
        interp: [[/`/, 'string', '@pop'], { include: 'root' }],
      },
    });
  }, []);

  const onEditorMount = useCallback(
    (editor) => {
      editor.focus();

      setParser((/* parser */) => {
        return () => {
          return parse(editor.getValue() + '\n');
        };
      });
    },
    [setParser]
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
