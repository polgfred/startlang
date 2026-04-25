import {
  type BrowserPresentationSnapshot,
  BrowserPresentationHost,
  browserPresentationGlobals,
} from '@startlang/lang-browser/browser';
import { rootCell } from '@startlang/lang-browser/cells';
import {
  Interpreter,
  type RuntimeEffect,
  type Snapshot,
} from '@startlang/lang-core/interpreter';
import { runtimeGlobals } from '@startlang/lang-core/runtime-globals';
import {
  BreakpointSuspension,
  InputSuspension,
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

interface RuntimeView extends Snapshot<BrowserPresentationSnapshot> {
  version: number;
  historyLength: number;
  historyIndex: number;
  isRunning: boolean;
  isSuspended: boolean;
  isRewound: boolean;
}

function createStartEnvironmentStore(
  interpreter: Interpreter<BrowserPresentationSnapshot>
) {
  const events = new EventTarget();
  let version = 0;

  function readView(): RuntimeView {
    return {
      ...interpreter.captureSnapshot(),
      version,
      historyLength: interpreter.history.length,
      historyIndex: interpreter.snapshotIndex,
      isRunning: interpreter.isRunning,
      isSuspended: interpreter.isSuspended,
      isRewound: interpreter.isRewound,
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
  const { current: store } = useRef(createStartEnvironmentStore(interpreter));
  const runtimeView = useSyncExternalStore(
    store.subscribe,
    store.getView,
    store.getView
  );
  const globalsRegisteredRef = useRef(false);

  if (!globalsRegisteredRef.current) {
    interpreter.registerGlobals(browserPresentationGlobals);
    interpreter.registerGlobals(runtimeGlobals);
    globalsRegisteredRef.current = true;
  }

  const syncOutputTab = useCallback(() => {
    const nextHasGraphicsOutput = host.shapes.length > 0;
    const nextHasTextOutput =
      host.outputBuffer.children.length > 0 ||
      host.currentCell.head !== rootCell ||
      interpreter.suspension instanceof InputSuspension;

    setOutputTab((current) =>
      chooseOutputTab(current, nextHasGraphicsOutput, nextHasTextOutput)
    );
  }, [host, interpreter]);

  const syncHighlight = useCallback(() => {
    if (
      interpreter.suspension instanceof BreakpointSuspension ||
      interpreter.snapshotIndex < interpreter.history.length - 1
    ) {
      highlightNode(interpreter.topFrame.head.node);
    } else {
      highlightNode(null);
    }
  }, [highlightNode, interpreter]);

  const finishInterpreterAction = useCallback(() => {
    syncOutputTab();
    syncHighlight();
    store.publish();
  }, [store, syncHighlight, syncOutputTab]);

  const handleRuntimeEffect = useCallback(
    async (effect: RuntimeEffect) => {
      switch (effect.kind) {
        case 'repaint': {
          store.publish();
          await waitForAnimationFrame();
          break;
        }
      }
    },
    [store]
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
    runtimeView.hostSnapshot.outputBuffer.children.length > 0 ||
    runtimeView.hostSnapshot.currentCell.head !== rootCell ||
    inputState !== null;

  const updateSlider = useCallback(
    (index: number) => {
      interpreter.moveToSnapshot(index);
      finishInterpreterAction();
    },
    [finishInterpreterAction, interpreter]
  );

  const runProgram = useCallback(async () => {
    setError(null);
    highlightNode(null);
    interpreter.clearHistory();
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
      await interpreter.continueFromSnapshot();
    } finally {
      finishInterpreterAction();
    }
  }, [finishInterpreterAction, highlightNode, interpreter]);

  const stopProgram = useCallback(() => {
    setError(null);
    interpreter.stop();
    highlightNode(null);
    finishInterpreterAction();
  }, [finishInterpreterAction, highlightNode, interpreter]);

  const isBreakpointSuspended =
    runtimeView.suspension instanceof BreakpointSuspension;
  const isInputSuspended = runtimeView.suspension instanceof InputSuspension;
  const isProgramActive =
    runtimeView.isRunning || runtimeView.isSuspended || runtimeView.isRewound;
  const runOrResume = useCallback(() => {
    if (interpreter.suspension instanceof BreakpointSuspension) {
      return resumeBreakpoint();
    }
    if (interpreter.isRewound) {
      return continueFromSnapshot();
    }
    return runProgram();
  }, [continueFromSnapshot, interpreter, resumeBreakpoint, runProgram]);

  return {
    error,
    hasGraphicsOutput,
    hasTextOutput,
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
