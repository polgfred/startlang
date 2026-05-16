import Monaco, { type BeforeMount, type OnMount } from '@monaco-editor/react';
import type { editor as MonacoEditor } from 'monaco-editor';
import { memo, useCallback, useLayoutEffect, useMemo, useRef } from 'react';

import { setupLanguage, useEditor } from './editor-context.jsx';
import { createStartSyntaxValidator } from './editor-diagnostics.js';
import styles from './editor.module.css';

function createEditorController(editor: MonacoEditor.ICodeEditor) {
  const decorations = editor.createDecorationsCollection([]);
  const hoverDecorations = editor.createDecorationsCollection([]);
  let layoutAnimationFrame: number | null = null;
  let hoveredLine: number | null = null;

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

  function setHoveredLine(lineNumber: number | null) {
    if (lineNumber === hoveredLine) {
      return;
    }

    hoveredLine = lineNumber;
    hoverDecorations.set(
      lineNumber === null
        ? []
        : [
            {
              range: {
                startLineNumber: lineNumber,
                startColumn: 1,
                endLineNumber: lineNumber,
                endColumn: 1,
              },
              options: {
                glyphMarginClassName: 'start-breakpoint-ghost',
                glyphMargin: { position: 1, persistLane: true },
              },
            },
          ]
    );
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
    setHoveredLine,
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
    highlightedNode,
    markers,
    resolveMarkerLine,
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
    if (highlightedNode) {
      const { kind, node } = highlightedNode;
      controller.revealLine(node.location.start.line);
      nextDecorations.push({
        range: {
          startLineNumber: node.location.start.line,
          startColumn: 1,
          endLineNumber: node.location.start.line,
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

    controller.setDecorations(nextDecorations);
  }, [highlightedNode, markers]);

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
        const inGutter = ev.target.type === 2;
        setPointer(inGutter);
        controller.setHoveredLine(
          inGutter && ev.target.position
            ? resolveMarkerLine(ev.target.position.lineNumber)
            : null
        );
      });
      editor.onMouseLeave(() => {
        setPointer(false);
        controller.setHoveredLine(null);
      });

      window.requestAnimationFrame(async () => {
        await document.fonts.ready;
        monaco.editor.remeasureFonts();
        editor.layout();
        editor.focus();
        runProgram();
      });
    },
    [resolveMarkerLine, runProgram, toggleMarker, updateDecorations]
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
