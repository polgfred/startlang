import {
  type BrowserPresentationSnapshot,
  BrowserPresentationHost,
  browserPresentationGlobals,
} from '@startlang/lang-browser/browser';
import { rootCell } from '@startlang/lang-browser/cells';
import {
  Interpreter,
  type RuntimeEffect,
  type RuntimeState,
} from '@startlang/lang-core/interpreter';
import { runtimeGlobals } from '@startlang/lang-core/runtime-globals';
import { RuntimeHistory } from '@startlang/lang-core/runtime-history';
import {
  InputSuspension,
  isBreakpointSuspension,
} from '@startlang/lang-core/suspension';
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

function createStartEnvironmentStore(
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

  function getView() {
    return view;
  }

  function publish() {
    version += 1;
    view = readView();
    events.dispatchEvent(new Event('change'));
  }

  return { getView, publish, subscribe };
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
  const { getMarkers, highlightNode, parseValue } = useEditor();

  const [outputTab, setOutputTab] = useState<OutputTab>('graphics');
  const [showInspector, setShowInspector] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const { current: host } = useRef(new BrowserPresentationHost());
  const { current: interpreter } = useRef(new Interpreter(host));
  const { current: history } = useRef(
    new RuntimeHistory<BrowserPresentationSnapshot>()
  );
  const { current: store } = useRef(
    createStartEnvironmentStore(interpreter, history)
  );
  const runtimeView = useSyncExternalStore(store.subscribe, store.getView);
  const globalsRegisteredRef = useRef(false);

  if (!globalsRegisteredRef.current) {
    interpreter.registerGlobals(browserPresentationGlobals);
    interpreter.registerGlobals(runtimeGlobals);
    globalsRegisteredRef.current = true;
  }

  const syncOutputTab = useCallback(() => {
    const nextHasGraphicsOutput = host.shapes.length > 0;
    const nextHasTextOutput =
      host.outputCells.length > 0 ||
      host.currentCell.head !== rootCell ||
      interpreter.suspension instanceof InputSuspension;

    setOutputTab((current) =>
      chooseOutputTab(current, nextHasGraphicsOutput, nextHasTextOutput)
    );
  }, [host, interpreter]);

  const syncHighlight = useCallback(() => {
    if (
      isBreakpointSuspension(interpreter.suspension) ||
      history.isRewound
    ) {
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

  const hasGraphicsOutput = runtimeView.hostSnapshot.shapes.length > 0;
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

  const runProgram = useCallback(async () => {
    setError(null);
    highlightNode(null);
    history.clear();
    host.clearDisplay();
    host.clearOutputBuffer();

    try {
      host.restoreOriginalSettings();
      const rootNode = parseValue();
      interpreter.setMarkers(rootNode, getMarkers());
      await interpreter.run(rootNode);
    } finally {
      finishInterpreterAction();
    }
  }, [
    finishInterpreterAction,
    getMarkers,
    history,
    highlightNode,
    host,
    interpreter,
    parseValue,
  ]);

  const resumeBreakpoint = useCallback(async () => {
    setError(null);

    try {
      await interpreter.resume(undefined);
    } finally {
      finishInterpreterAction();
    }
  }, [finishInterpreterAction, interpreter]);

  const continueFromSnapshot = useCallback(async () => {
    setError(null);
    highlightNode(null);

    try {
      history.truncateAfterCurrent();
      await interpreter.runLoop();
    } finally {
      finishInterpreterAction();
    }
  }, [finishInterpreterAction, highlightNode, history, interpreter]);

  const stopProgram = useCallback(() => {
    setError(null);
    interpreter.stop();
    highlightNode(null);
    finishInterpreterAction();
  }, [finishInterpreterAction, highlightNode, interpreter]);

  const isBreakpointSuspended =
    isBreakpointSuspension(runtimeView.suspension);
  const isInputSuspended = runtimeView.suspension instanceof InputSuspension;
  const isProgramActive =
    runtimeView.isRunning || runtimeView.isSuspended || runtimeView.isRewound;
  const runOrResume = useCallback(() => {
    if (isBreakpointSuspension(interpreter.suspension)) {
      return resumeBreakpoint();
    }
    if (history.isRewound) {
      return continueFromSnapshot();
    }
    return runProgram();
  }, [
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
    isRunDisabled: runtimeView.isRunning || isInputSuspended,
    isStopDisabled: !isProgramActive,
    isEditorReadOnly: isProgramActive,
    outputTab,
    runLabel: isBreakpointSuspended ? 'Continue' : 'Run',
    runOrResume,
    setOutputTab,
    setShowInspector,
    showInspector,
    stopProgram,
    updateSlider,
  };
}
