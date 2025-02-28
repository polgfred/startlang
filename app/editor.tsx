import Monaco, { type BeforeMount, type OnMount } from '@monaco-editor/react';
import { editor as ed, languages as lang, Range } from 'monaco-editor';
import { type RefObject, useCallback, useLayoutEffect } from 'react';

import { MarkerType } from '../src/lang/types';
import boxScript from '../tests/box.start';

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

function setupLineMarkers(editor: ed.ICodeEditor, markers: MarkerType[]) {
  const decorations = editor.createDecorationsCollection([]);
  markers.length = 0;

  editor.onMouseMove((ev) => {
    if (ev.target.type === ed.MouseTargetType.GUTTER_GLYPH_MARGIN) {
      const node = editor.getDomNode();
      if (node) {
        node.style.cursor = 'pointer';
      }
    }
  });

  editor.onMouseDown((ev) => {
    if (ev.target.type === ed.MouseTargetType.GUTTER_GLYPH_MARGIN) {
      const { lineNumber } = ev.target.position;
      if (!markers[lineNumber]) {
        markers[lineNumber] = 'breakpoint';
      } else if (markers[lineNumber] === 'breakpoint') {
        markers[lineNumber] = 'snapshot';
      } else {
        // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
        delete markers[lineNumber];
      }

      decorations.set(
        markers.reduce<ed.IModelDeltaDecoration[]>(
          (acc, marker, lineNumber) => {
            acc.push({
              range: new Range(lineNumber, 1, lineNumber, 1),
              options: {
                isWholeLine: true,
                glyphMarginClassName: marker,
              },
            });
            return acc;
          },
          []
        )
      );
    }
  });
}

export default function Editor({
  editorRef,
  markers,
  showInspector,
  runProgram,
}: {
  editorRef: RefObject<ed.ICodeEditor | null>;
  markers: MarkerType[];
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

      setupLineMarkers(editor, markers);

      editor.focus();
      runProgram();
    },
    [editorRef, runProgram, markers]
  );

  const updateLayout = useCallback(() => {
    if (editorRef.current) {
      // @ts-expect-error 'auto' is allowed
      editorRef.current.layout({ width: 'auto', height: 'auto' });
    }
  }, [editorRef]);

  // showInspector is a dependency because we want the editor to resize when
  // the inspector is toggled
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
    <div
      sx={{
        width: '100%',
        height: '100%',
        '& .glyph-margin-widgets > .codicon': {
          marginTop: '-3px',
          '&::before': {
            content: '"\u2022"',
            fontSize: 40,
          },
        },
        '& .glyph-margin-widgets > .breakpoint::before': {
          color: 'red',
        },
        '& .glyph-margin-widgets > .snapshot::before': {
          color: 'green',
        },
      }}
    >
      <Monaco
        defaultValue={boxScript}
        language="start"
        beforeMount={onBeforeMount}
        onMount={onEditorMount}
        options={{
          minimap: { enabled: false },
          glyphMargin: true,
          scrollBeyondLastLine: false,
        }}
      />
    </div>
  );
}
