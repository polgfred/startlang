import Monaco, { type BeforeMount, type OnMount } from '@monaco-editor/react';
import type { editor as MonacoEditor } from 'monaco-editor';
import {
  memo,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
} from 'react';

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

type GutterDecorationKind =
  | 'current'
  | 'error'
  | 'breakpoint'
  | 'snapshot'
  | 'hint';

function gutterDecoration(
  lineNumber: number,
  kind: GutterDecorationKind
): MonacoEditor.IModelDeltaDecoration {
  const range = {
    startLineNumber: lineNumber,
    startColumn: 1,
    endLineNumber: lineNumber,
    endColumn: 1,
  };
  switch (kind) {
    case 'current':
      return {
        range,
        options: {
          glyphMarginClassName: 'start-current',
          glyphMargin: { position: 3, persistLane: true },
          glyphMarginHoverMessage: { value: 'Paused here.' },
        },
      };
    case 'error':
      return {
        range,
        options: {
          glyphMarginClassName: 'start-error',
          glyphMargin: { position: 3, persistLane: true },
          glyphMarginHoverMessage: { value: 'Error here.' },
        },
      };
    case 'breakpoint':
      return {
        range,
        options: {
          isWholeLine: true,
          glyphMarginClassName: 'start-breakpoint',
          glyphMargin: { position: 1, persistLane: true },
          glyphMarginHoverMessage: {
            value: 'Breakpoint: click to change to snapshot.',
          },
        },
      };
    case 'snapshot':
      return {
        range,
        options: {
          isWholeLine: true,
          glyphMarginClassName: 'start-snapshot',
          glyphMargin: { position: 1, persistLane: true },
          glyphMarginHoverMessage: { value: 'Snapshot: click to clear.' },
        },
      };
    case 'hint':
      return {
        range,
        options: {
          glyphMarginClassName: 'start-marker-hint',
          glyphMargin: { position: 1, persistLane: true },
          glyphMarginHoverMessage: {
            value: 'Click here to set a breakpoint or snapshot.',
          },
        },
      };
  }
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
    editorReady,
    highlightedLine,
    markableLines,
    markers,
    setEditorReady,
    setValue,
    shiftMarkers,
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
      nextDecorations.push(gutterDecoration(lineNumber, kind));
    }

    const markedLines = new Set<number>();
    for (const { lineNumber, marker } of markers) {
      markedLines.add(lineNumber);
      nextDecorations.push(gutterDecoration(lineNumber, marker));
    }

    for (const lineNumber of markableLines) {
      if (!markedLines.has(lineNumber)) {
        nextDecorations.push(gutterDecoration(lineNumber, 'hint'));
      }
    }

    controller.setDecorations(nextDecorations);
  }, [highlightedLine, markableLines, markers]);

  const onEditorMount: OnMount = useCallback(
    (editor, monaco) => {
      const controller = createEditorController(editor);
      const cleanupEditorLayout = observeEditorLayout(
        controller.scheduleLayout
      );
      const syntaxValidator = createStartSyntaxValidator(editor, monaco);
      controllerRef.current = controller;
      setEditorReady(true);

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
      });
    },
    [runProgram, setEditorReady, toggleMarker]
  );

  const onEditorChange = useCallback(
    (
      value: string | undefined,
      event: MonacoEditor.IModelContentChangedEvent
    ) => {
      if (event.isFlush) {
        // editor is completely reset, we don't have any markers to shift
        return;
      }
      for (const change of event.changes) {
        const newlineCount = (change.text.match(/\n/g) ?? []).length;
        const oldLineSpan =
          change.range.endLineNumber - change.range.startLineNumber;
        const lineDelta = newlineCount - oldLineSpan;
        if (lineDelta !== 0) {
          shiftMarkers(
            change.range.startLineNumber,
            change.range.endLineNumber,
            lineDelta
          );
        }
      }
      setValue(value ?? '');
    },
    [setValue, shiftMarkers]
  );

  // apply decorations when the editor finishes mounting and on source changes
  useEffect(() => {
    updateDecorations();
  }, [editorReady, source, updateDecorations]);

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
