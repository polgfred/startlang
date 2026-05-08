import {
  type BrowserPresentationSnapshot,
  BrowserPresentationHost,
  browserPresentationGlobals,
} from '@startlang/lang-browser/browser';
import { rootCell } from '@startlang/lang-browser/cells';
import { rootShapeGroup } from '@startlang/lang-browser/shapes';
import {
  Interpreter,
  type RuntimeEffect,
  type RunResult,
  type RuntimeState,
} from '@startlang/lang-core/interpreter';
import { rootFrame } from '@startlang/lang-core/nodes';
import { runtimeGlobals } from '@startlang/lang-core/runtime-globals';
import { RuntimeHistory } from '@startlang/lang-core/runtime-history';
import {
  InputSuspension,
  isBreakpointSuspension,
} from '@startlang/lang-core/suspension';
import type { IndexType } from '@startlang/lang-core/types';
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from 'react';

import { useEditor } from './editor-context.jsx';

type OutputTab = 'graphics' | 'text';

interface RuntimeView extends RuntimeState<BrowserPresentationSnapshot> {
  version: number;
  historyLength: number;
  historyIndex: number;
  isRunning: boolean;
  isSuspended: boolean;
  isRewound: boolean;
}

function createInterpreterStore(
  interpreter: Interpreter<BrowserPresentationSnapshot>,
  history: RuntimeHistory<BrowserPresentationSnapshot>
) {
  const events = new EventTarget();
  let version = 0;

  function readView(): RuntimeView {
    return {
      version,
      ...interpreter.captureState(),
      historyLength: history.length,
      historyIndex: history.index,
      isRunning: interpreter.isRunning,
      isSuspended: interpreter.isSuspended,
      isRewound: history.isRewound,
    };
  }

  let view = readView();

  function subscribe(listener: () => void) {
    events.addEventListener('change', listener);
    return () => {
      events.removeEventListener('change', listener);
    };
  }

  function publish() {
    version += 1;
    view = readView();
    events.dispatchEvent(new Event('change'));
  }

  return {
    getView: () => view,
    publish,
    subscribe,
  };
}

function chooseOutputTab(
  current: OutputTab,
  hasGraphicsOutput: boolean,
  hasTextOutput: boolean
) {
  if (current === 'graphics' && !hasGraphicsOutput && hasTextOutput) {
    return 'text';
  }
  if (current === 'text' && !hasTextOutput && hasGraphicsOutput) {
    return 'graphics';
  }
  return current;
}

function waitForAnimationFrame() {
  return new Promise<void>((resolve) => {
    requestAnimationFrame(() => resolve());
  });
}

export function useStartEnvironment() {
  const { highlightNode, parseProgram } = useEditor();

  const [outputTab, setOutputTab] = useState<OutputTab>('graphics');
  const [showInspector, setShowInspector] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const { current: host } = useRef(new BrowserPresentationHost());
  const { current: interpreter } = useRef(new Interpreter(host));
  const { current: history } = useRef(
    new RuntimeHistory<BrowserPresentationSnapshot>()
  );
  const { current: store } = useRef(
    createInterpreterStore(interpreter, history)
  );
  const runtimeView = useSyncExternalStore(store.subscribe, store.getView);
  const globalsRegisteredRef = useRef(false);

  if (!globalsRegisteredRef.current) {
    interpreter.registerGlobals(browserPresentationGlobals);
    interpreter.registerGlobals(runtimeGlobals);
    globalsRegisteredRef.current = true;
  }

  const syncOutputTab = useCallback(() => {
    const nextHasGraphicsOutput =
      host.shapes.length > 0 || host.currentGroup.head !== rootShapeGroup;
    const nextHasTextOutput =
      host.cells.length > 0 ||
      host.currentCell.head !== rootCell ||
      interpreter.suspension instanceof InputSuspension;

    setOutputTab((current) =>
      chooseOutputTab(current, nextHasGraphicsOutput, nextHasTextOutput)
    );
  }, [host, interpreter]);

  const syncHighlight = useCallback(() => {
    if (isBreakpointSuspension(interpreter.suspension) || history.isRewound) {
      highlightNode(interpreter.topFrame.head.node);
    } else {
      highlightNode(null);
    }
  }, [highlightNode, history, interpreter]);

  const finishInterpreterAction = useCallback(() => {
    syncOutputTab();
    syncHighlight();
    store.publish();
  }, [store, syncHighlight, syncOutputTab]);

  const handleRuntimeEffect = useCallback(
    async (effect: RuntimeEffect) => {
      switch (effect.kind) {
        case 'snapshot': {
          history.push(interpreter.captureState());
          break;
        }
        case 'repaint': {
          syncOutputTab();
          store.publish();
          await waitForAnimationFrame();
          break;
        }
      }
    },
    [history, interpreter, store, syncOutputTab]
  );

  interpreter.effectHandler = handleRuntimeEffect;

  useEffect(() => {
    const handleAppError = (event: PromiseRejectionEvent) => {
      const { reason } = event;
      if (!(reason instanceof Error)) {
        return;
      }

      setError(reason);
      // eslint-disable-next-line no-console
      console.error(reason.stack);
      event.preventDefault();
    };

    window.addEventListener('unhandledrejection', handleAppError);
    return () => {
      window.removeEventListener('unhandledrejection', handleAppError);
    };
  }, []);

  const resumeInput = useCallback(
    async (value: string) => {
      setError(null);

      try {
        await interpreter.resume(value);
      } finally {
        finishInterpreterAction();
      }
    },
    [finishInterpreterAction, interpreter]
  );

  const inputState = useMemo(
    () =>
      runtimeView.suspension instanceof InputSuspension
        ? {
            prompt: runtimeView.suspension.prompt,
            initial: runtimeView.suspension.initial,
            onInputComplete: resumeInput,
          }
        : null,
    [runtimeView.suspension, resumeInput]
  );

  const hasGraphicsOutput =
    runtimeView.hostSnapshot.shapes.length > 0 ||
    runtimeView.hostSnapshot.currentShapeGroup.head !== rootShapeGroup;
  const hasTextOutput =
    runtimeView.hostSnapshot.outputCells.length > 0 ||
    runtimeView.hostSnapshot.currentCell.head !== rootCell ||
    inputState !== null;

  const updateSlider = useCallback(
    (index: number) => {
      interpreter.restoreState(history.moveTo(index));
      finishInterpreterAction();
    },
    [finishInterpreterAction, history, interpreter]
  );

  const captureFinalState = useCallback(
    (result: RunResult) => {
      if (result.status === 'completed' && history.length > 0) {
        history.push(interpreter.captureState());
      }
    },
    [history, interpreter]
  );

  const runProgram = useCallback(async () => {
    setError(null);
    highlightNode(null);
    history.clear();
    host.clearDisplay();
    host.clearOutputBuffer();

    try {
      host.restoreOriginalSettings();
      const { markerMap, node } = parseProgram();
      interpreter.setMarkerMap(markerMap);
      const result = await interpreter.run(node);
      captureFinalState(result);
    } finally {
      finishInterpreterAction();
    }
  }, [
    captureFinalState,
    finishInterpreterAction,
    history,
    highlightNode,
    host,
    interpreter,
    parseProgram,
  ]);

  const resumeBreakpoint = useCallback(async () => {
    setError(null);

    try {
      const result = await interpreter.resume(undefined);
      captureFinalState(result);
    } finally {
      finishInterpreterAction();
    }
  }, [captureFinalState, finishInterpreterAction, interpreter]);

  const continueFromSnapshot = useCallback(async () => {
    setError(null);
    highlightNode(null);

    try {
      history.truncateAfterCurrent();
      const result = await interpreter.runLoop();
      captureFinalState(result);
    } finally {
      finishInterpreterAction();
    }
  }, [
    captureFinalState,
    finishInterpreterAction,
    highlightNode,
    history,
    interpreter,
  ]);

  const stopProgram = useCallback(() => {
    setError(null);
    interpreter.stop();
    highlightNode(null);
    finishInterpreterAction();
  }, [finishInterpreterAction, highlightNode, interpreter]);

  const isBreakpointSuspended = isBreakpointSuspension(runtimeView.suspension);
  const isInputSuspended = runtimeView.suspension instanceof InputSuspension;
  const canContinueFromSnapshot =
    !runtimeView.isSuspended && runtimeView.topFrame !== rootFrame;
  const isProgramActive =
    runtimeView.isRunning ||
    runtimeView.isSuspended ||
    runtimeView.isRewound ||
    canContinueFromSnapshot;
  const canEditInspectorValues =
    isBreakpointSuspended || runtimeView.isRewound || canContinueFromSnapshot;

  const updateInspectorValue = useCallback(
    (
      scope: 'global' | 'local',
      name: string,
      indexes: readonly IndexType[],
      value: unknown
    ) => {
      if (
        history.isRewound &&
        !window.confirm(
          'Changing this value will discard later snapshots and continue from here.'
        )
      ) {
        return false;
      }

      setError(null);
      if (scope === 'global') {
        if (indexes.length > 0) {
          interpreter.setGlobalVariableIndex(name, indexes, value);
        } else {
          interpreter.setGlobalVariable(name, value);
        }
      } else if (indexes.length > 0) {
        interpreter.setLocalVariableIndex(name, indexes, value);
      } else {
        interpreter.setLocalVariable(name, value);
      }
      history.replaceCurrent(interpreter.captureState());
      finishInterpreterAction();
      return true;
    },
    [finishInterpreterAction, history, interpreter]
  );

  const runOrResume = useCallback(() => {
    if (isBreakpointSuspension(interpreter.suspension)) {
      return resumeBreakpoint();
    }
    if (history.isRewound || canContinueFromSnapshot) {
      return continueFromSnapshot();
    }
    return runProgram();
  }, [
    canContinueFromSnapshot,
    continueFromSnapshot,
    history,
    interpreter,
    resumeBreakpoint,
    runProgram,
  ]);

  return {
    error,
    hasGraphicsOutput,
    hasTextOutput,
    history,
    host,
    inputState,
    interpreter,
    canEditInspectorValues,
    isRunDisabled: runtimeView.isRunning || isInputSuspended,
    isStopDisabled: !isProgramActive,
    isEditorReadOnly: isProgramActive,
    outputTab,
    runtimeVersion: runtimeView.version,
    runProgram,
    runLabel:
      isBreakpointSuspended || canContinueFromSnapshot ? 'Continue' : 'Run',
    runOrResume,
    setOutputTab,
    setShowInspector,
    showInspector,
    stopProgram,
    updateInspectorValue,
    updateSlider,
  };
}
