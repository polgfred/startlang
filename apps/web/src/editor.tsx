import Monaco, { type BeforeMount, type OnMount } from '@monaco-editor/react';
import type { editor as MonacoEditor } from 'monaco-editor';
import { memo, useCallback, useLayoutEffect, useMemo, useRef } from 'react';

import { setupLanguage, useEditor } from './editor-context.jsx';
import { createStartSyntaxValidator } from './editor-diagnostics.js';
import styles from './editor.module.css';

function createEditorController(editor: MonacoEditor.ICodeEditor) {
  const decorations = editor.createDecorationsCollection([]);
  let layoutAnimationFrame: number | null = null;

  function scheduleLayout() {
    if (layoutAnimationFrame !== null) {
      return;
    }

    layoutAnimationFrame = window.requestAnimationFrame(() => {
      layoutAnimationFrame = null;
      // @ts-expect-error 'auto' is allowed
      editor.layout({ width: 'auto', height: 'auto' });
    });
  }

  function revealLine(lineNumber: number) {
    editor.revealLineInCenterIfOutsideViewport(lineNumber);
  }

  function setDecorations(next: MonacoEditor.IModelDeltaDecoration[]) {
    decorations.set(next);
  }

  function dispose() {
    if (layoutAnimationFrame !== null) {
      window.cancelAnimationFrame(layoutAnimationFrame);
      layoutAnimationFrame = null;
    }
  }

  return {
    dispose,
    revealLine,
    scheduleLayout,
    setDecorations,
  };
}

type EditorController = ReturnType<typeof createEditorController>;

function observeEditorLayout(scheduleLayout: () => void) {
  window.addEventListener('resize', scheduleLayout, false);
  return () => {
    window.removeEventListener('resize', scheduleLayout, false);
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
  const {
    highlightedLine,
    markableLines,
    markers,
    setValue,
    source,
    toggleMarker,
  } = useEditor();
  const controllerRef = useRef<EditorController | null>(null);

  const onBeforeMount: BeforeMount = useCallback((monaco) => {
    setupLanguage(monaco);
  }, []);

  const updateDecorations = useCallback(() => {
    const controller = controllerRef.current;
    if (!controller) {
      return;
    }

    const nextDecorations: MonacoEditor.IModelDeltaDecoration[] = [];
    if (highlightedLine) {
      const { kind, lineNumber } = highlightedLine;
      controller.revealLine(lineNumber);
      nextDecorations.push({
        range: {
          startLineNumber: lineNumber,
          startColumn: 1,
          endLineNumber: lineNumber,
          endColumn: 1,
        },
        options: {
          glyphMarginClassName:
            kind === 'error' ? 'start-error' : 'start-current',
          glyphMargin: {
            position: 3,
            persistLane: true,
          },
          glyphMarginHoverMessage: {
            value: kind === 'error' ? 'Error here.' : 'Paused here.',
          },
        },
      });
    }

    const markedLines = new Set<number>();

    for (const { lineNumber, marker } of markers) {
      const label = marker === 'breakpoint' ? 'Breakpoint' : 'Snapshot';
      markedLines.add(lineNumber);
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

    for (const lineNumber of markableLines()) {
      if (markedLines.has(lineNumber)) {
        continue;
      }
      nextDecorations.push({
        range: {
          startLineNumber: lineNumber,
          startColumn: 1,
          endLineNumber: lineNumber,
          endColumn: 1,
        },
        options: {
          glyphMarginClassName: 'start-marker-hint',
          glyphMargin: { position: 1, persistLane: true },
          glyphMarginHoverMessage: {
            value: 'Click here to set a breakpoint or snapshot.',
          },
        },
      });
    }

    controller.setDecorations(nextDecorations);
  }, [highlightedLine, markableLines, markers, source]);

  const onEditorMount: OnMount = useCallback(
    (editor, monaco) => {
      const controller = createEditorController(editor);
      const cleanupEditorLayout = observeEditorLayout(
        controller.scheduleLayout
      );
      const syntaxValidator = createStartSyntaxValidator(editor, monaco);
      controllerRef.current = controller;

      updateDecorations();

      editor.onDidDispose(() => {
        syntaxValidator.dispose();
        cleanupEditorLayout();
        controller.dispose();
        if (controllerRef.current === controller) {
          controllerRef.current = null;
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
    controllerRef.current?.scheduleLayout();
  }, [layoutSignal]);

  const options = useMemo<MonacoEditor.IStandaloneEditorConstructionOptions>(
    () => ({
      glyphMargin: true,
      fontFamily: 'var(--font-mono)',
      fontSize: 13,
      minimap: { enabled: false },
      readOnly: isReadOnly,
      readOnlyMessage: {
        value: 'Exit the program before editing source code.',
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
