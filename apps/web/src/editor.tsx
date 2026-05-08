import Monaco, { type BeforeMount, type OnMount } from '@monaco-editor/react';
import type { editor as MonacoEditor } from 'monaco-editor';
import { memo, useCallback, useLayoutEffect, useMemo, useRef } from 'react';

import { setupLanguage, useEditor } from './editor-context.jsx';
import { createStartSyntaxValidator } from './editor-diagnostics.js';
import styles from './editor.module.css';

function createEditorLayoutScheduler(editor: MonacoEditor.ICodeEditor) {
  let layoutAnimationFrame: number | null = null;

  function schedule() {
    if (layoutAnimationFrame !== null) {
      return;
    }

    layoutAnimationFrame = window.requestAnimationFrame(() => {
      layoutAnimationFrame = null;
      // @ts-expect-error 'auto' is allowed
      editor.layout({ width: 'auto', height: 'auto' });
    });
  }

  function dispose() {
    if (layoutAnimationFrame !== null) {
      window.cancelAnimationFrame(layoutAnimationFrame);
      layoutAnimationFrame = null;
    }
  }

  return { dispose, schedule };
}

type EditorLayoutScheduler = ReturnType<typeof createEditorLayoutScheduler>;

function observeEditorLayout(layoutScheduler: EditorLayoutScheduler) {
  window.addEventListener('resize', layoutScheduler.schedule, false);
  return () => {
    window.removeEventListener('resize', layoutScheduler.schedule, false);
    layoutScheduler.dispose();
  };
}

export default memo(function Editor({
  runProgram,
  isReadOnly,
  layoutSignal,
}: {
  runProgram: () => void;
  isReadOnly: boolean;
  layoutSignal: unknown;
}) {
  const { highlightedNode, markers, setValue, source, toggleMarker } =
    useEditor();
  const layoutSchedulerRef = useRef<EditorLayoutScheduler | null>(null);
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
          startColumn: 1,
          endLineNumber: highlightedNode.location.start.line,
          endColumn: 1,
        },
        options: {
          glyphMarginClassName: 'start-current',
          glyphMargin: {
            position: 3,
            persistLane: true,
          },
          glyphMarginHoverMessage: {
            value: 'Paused here.',
          },
        },
      });
    }

    for (const { lineNumber, marker } of markers) {
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
          glyphMargin: {
            position: 1,
            persistLane: true,
          },
          glyphMarginHoverMessage: {
            value: `${label}: click to ${
              marker === 'breakpoint' ? 'change to snapshot' : 'clear'
            }.`,
          },
        },
      });
    }

    decorations.set(nextDecorations);
  }, [highlightedNode, markers]);

  const onEditorMount: OnMount = useCallback(
    (editor, monaco) => {
      const layoutScheduler = createEditorLayoutScheduler(editor);
      const cleanupEditorLayout = observeEditorLayout(layoutScheduler);
      const syntaxValidator = createStartSyntaxValidator(editor, monaco);
      layoutSchedulerRef.current = layoutScheduler;

      decorationsRef.current = editor.createDecorationsCollection([]);
      updateDecorations();

      editor.onDidDispose(() => {
        syntaxValidator.dispose();
        cleanupEditorLayout();
        if (layoutSchedulerRef.current === layoutScheduler) {
          layoutSchedulerRef.current = null;
        }
      });

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

  useLayoutEffect(() => {
    layoutSchedulerRef.current?.schedule();
  }, [layoutSignal]);

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
        value={source}
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
