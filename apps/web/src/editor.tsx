import Monaco, { type BeforeMount, type OnMount } from '@monaco-editor/react';
import type { editor as MonacoEditor } from 'monaco-editor';
import { memo, useCallback, useLayoutEffect, useMemo, useRef } from 'react';

import { setupLanguage, useEditor } from './editor-context.jsx';
import styles from './editor.module.css';

function observeEditorLayout(editor: MonacoEditor.ICodeEditor) {
  let layoutAnimationFrame: number | null = null;
  const layoutSoon = () => {
    if (layoutAnimationFrame !== null) {
      return;
    }

    layoutAnimationFrame = window.requestAnimationFrame(() => {
      layoutAnimationFrame = null;
      // @ts-expect-error 'auto' is allowed
      editor.layout({ width: 'auto', height: 'auto' });
    });
  };

  window.addEventListener('resize', layoutSoon, false);
  editor.onDidDispose(() => {
    if (layoutAnimationFrame !== null) {
      window.cancelAnimationFrame(layoutAnimationFrame);
    }
    window.removeEventListener('resize', layoutSoon, false);
  });
}

export default memo(function Editor({
  runProgram,
  isReadOnly,
}: {
  runProgram: () => void;
  isReadOnly: boolean;
}) {
  const {
    highlightedNode,
    markers,
    setValue,
    sourceValue,
    toggleMarker,
  } = useEditor();
  const decorationsRef =
    useRef<MonacoEditor.IEditorDecorationsCollection | null>(null);

  const onBeforeMount: BeforeMount = useCallback((monaco) => {
    setupLanguage(monaco);
  }, []);

  const updateDecorations = useCallback(() => {
    const decorations = decorationsRef.current;
    if (!decorations) {
      return;
    }

    const nextDecorations: MonacoEditor.IModelDeltaDecoration[] = [];
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

    markers.forEach((marker, lineNumber) => {
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
  }, [highlightedNode, markers]);

  const onEditorMount: OnMount = useCallback(
    (editor, monaco) => {
      decorationsRef.current = editor.createDecorationsCollection([]);
      updateDecorations();
      observeEditorLayout(editor);

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

      window.requestAnimationFrame(async () => {
        await document.fonts.ready;
        monaco.editor.remeasureFonts();
        editor.layout();
        editor.focus();
        runProgram();
      });
    },
    [runProgram, toggleMarker, updateDecorations]
  );

  const onEditorChange = useCallback(
    (value?: string) => {
      setValue(value ?? '');
    },
    [setValue]
  );

  useLayoutEffect(() => {
    updateDecorations();
  }, [updateDecorations]);

  const options = useMemo<MonacoEditor.IStandaloneEditorConstructionOptions>(
    () => ({
      glyphMargin: true,
      fontFamily: 'var(--font-mono)',
      fontSize: 13,
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
        value={sourceValue}
        language="start"
        theme="start-light"
        beforeMount={onBeforeMount}
        onMount={onEditorMount}
        onChange={onEditorChange}
        options={options}
      />
    </div>
  );
});
