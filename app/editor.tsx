import Monaco, { type BeforeMount, type OnMount } from '@monaco-editor/react';
import { useCallback, useLayoutEffect } from 'react';

import boxScript from '../tests/box.start';

import { useEnvironment } from './environment.jsx';
import { setupLanguage, useEditor } from './monaco.jsx';

export default function Editor({ showInspector }: { showInspector: boolean }) {
  const { autoLayout, initEditor, requireEditor, toggleMarker } = useEditor();

  const { runProgram } = useEnvironment();

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

      editor.onMouseMove((ev) => {
        // 2 = GUTTER_GLYPH_MARGIN
        // (using a constant so we don't have to import monaco-editor)
        if (ev.target.type === 2) {
          const node = requireEditor().getDomNode();
          if (node) {
            node.style.cursor = 'pointer';
          }
        }
      });

      editor.onMouseDown((ev) => {
        // 2 = GUTTER_GLYPH_MARGIN
        if (ev.target.type === 2) {
          const { lineNumber } = ev.target.position;
          toggleMarker(lineNumber);
        }
      });

      editor.focus();
      runProgram();
    },
    [initEditor, requireEditor, runProgram, toggleMarker]
  );

  // showInspector is a dependency because we want the editor to resize when
  // the inspector is toggled
  useLayoutEffect(() => {
    autoLayout();
  }, [autoLayout, showInspector]);

  useLayoutEffect(() => {
    window.addEventListener('resize', autoLayout, false);
    return () => {
      window.removeEventListener('resize', autoLayout, false);
    };
  }, [autoLayout]);

  return (
    <div
      sx={{
        width: '100%',
        height: '100%',
        '& .glyph-margin-widgets': {
          '& > .codicon': {
            marginTop: '-3px',
          },
          '& > .breakpoint::before': {
            color: 'red',
            content: '"\u2022"',
            fontSize: 40,
          },
          '& > .snapshot::before': {
            color: 'green',
            content: '"\u2022"',
            fontSize: 40,
          },
        },
        '& .highlight': {
          backgroundColor: '#6b9da080',
          width: '5px !important',
          marginLeft: '12px',
        },
      }}
    >
      <Monaco
        language="start"
        defaultValue={boxScript}
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
