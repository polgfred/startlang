import Monaco, { type BeforeMount, type OnMount } from '@monaco-editor/react';
import { memo, useCallback, useLayoutEffect, useMemo } from 'react';

import boxScript from '../tests/box.start';

import { setupLanguage, useEditor } from './editor-context.jsx';
import styles from './Editor.module.css';

export default memo(function Editor({
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
      let isPointer = false;
      const setPointer = (nextIsPointer: boolean) => {
        if (nextIsPointer === isPointer) {
          return;
        }

        isPointer = nextIsPointer;
        const node = editor.getDomNode();
        if (node) {
          node.style.cursor = nextIsPointer ? 'pointer' : '';
        }
      };

      editor.onMouseMove((ev) => {
        // 2 = GUTTER_GLYPH_MARGIN
        setPointer(ev.target.type === 2);
      });
      editor.onMouseLeave(() => {
        setPointer(false);
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

  const options = useMemo(
    () => ({
      glyphMargin: true,
      minimap: { enabled: false },
      readOnly: isReadOnly,
      readOnlyMessage: {
        value: 'Stop the program before editing source code.',
      },
      scrollBeyondLastLine: false,
    }),
    [isReadOnly]
  );

  return (
    <div className={styles.editor}>
      <Monaco
        defaultValue={boxScript}
        language="start"
        theme="start-light"
        beforeMount={onBeforeMount}
        onMount={onEditorMount}
        options={options}
      />
    </div>
  );
});
