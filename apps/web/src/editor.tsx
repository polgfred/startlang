import Monaco, { type BeforeMount, type OnMount } from '@monaco-editor/react';
import { Box } from '@mui/material';
import { useCallback, useLayoutEffect } from 'react';

import boxScript from '../tests/box.start';

import { setupLanguage, useEditor } from './editor-context.jsx';

export default function Editor({
  showInspector,
  runProgram,
  isReadOnly,
}: {
  showInspector: boolean;
  runProgram: () => void;
  isReadOnly: boolean;
}) {
  const { autoLayout, initEditor, toggleMarker } = useEditor();

  const onBeforeMount: BeforeMount = useCallback((monaco) => {
    setupLanguage(monaco);
  }, []);

  const onEditorMount: OnMount = useCallback(
    (editor) => {
      initEditor(editor);
      editor.onKeyUp((ev) => {
        if (ev.code === 'Enter' && ev.ctrlKey) {
          runProgram();
        }
      });
      editor.onMouseDown((ev) => {
        // 2 = GUTTER_GLYPH_MARGIN
        if (ev.target.type === 2 && ev.target.position) {
          toggleMarker(ev.target.position.lineNumber);
        }
      });
      editor.focus();
      runProgram();
    },
    [initEditor, runProgram, toggleMarker]
  );

  useLayoutEffect(() => {
    autoLayout();
  }, [showInspector, autoLayout]);

  useLayoutEffect(() => {
    window.addEventListener('resize', autoLayout, false);
    return () => {
      window.removeEventListener('resize', autoLayout, false);
    };
  }, [autoLayout]);

  return (
    <Box
      sx={{
        width: '100%',
        height: '100%',
        '& .glyph-margin-widgets > .codicon': {
          marginTop: '-3px',
        },
        '& .start-breakpoint::before': {
          color: 'red',
          content: '"\\2022"',
          fontSize: 40,
        },
        '& .start-snapshot::before': {
          color: 'green',
          content: '"\\2022"',
          fontSize: 40,
        },
        '& .start-highlight': {
          backgroundColor: '#6b9da080',
          width: '5px !important',
          marginLeft: '12px',
        },
      }}
    >
      <Monaco
        defaultValue={boxScript}
        language="start"
        beforeMount={onBeforeMount}
        onMount={onEditorMount}
        options={{
          glyphMargin: true,
          minimap: { enabled: false },
          readOnly: isReadOnly,
          readOnlyMessage: {
            value: 'Stop the program before editing source code.',
          },
          scrollBeyondLastLine: false,
        }}
      />
    </Box>
  );
}
