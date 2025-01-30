'use client';

import Monaco from '@monaco-editor/react';
import { useCallback } from 'react';

import { parse } from '../../src/lang/parser.peggy';
import boxScript from '../../tests/box.start';

export default function Editor({ setParser }) {
  const onBeforeMount = useCallback((monaco) => {
    monaco.languages.register({ id: 'start' });
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
      operators: ['+', '-', '*', '/', '%', '!', '<', '<=', '=', '>', '>='],
      tokenizer: {
        root: [
          [
            /[a-zA-Z_][\w]*/,
            {
              cases: {
                '@keywords': 'keyword',
                '@default': 'identifier',
              },
            },
          ],
          [/[ \t\r\n]+/, 'white'],
          [/;.*$/, 'comment'],
          [/[,+\-*/%!=<>&|~]/, 'delimiter'],
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
