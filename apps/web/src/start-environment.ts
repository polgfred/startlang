import {
  BrowserPresentationHost,
  buildBrowserGlobals,
} from '@startlang/lang-browser/browser';
import { rootCell } from '@startlang/lang-browser/cells';
import { rootShapeGroup } from '@startlang/lang-browser/shapes';
import {
  AbortedError,
  Interpreter,
  RuntimeError,
  type RuntimeEffect,
  type RuntimePause,
  type RunResult,
  type RuntimeState,
} from '@startlang/lang-core/interpreter';
import type { Program } from '@startlang/lang-core/program';
import { runtimeGlobals } from '@startlang/lang-core/runtime-globals';
import { RuntimeHistory } from '@startlang/lang-core/runtime-history';
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
type InspectorScope = 'global' | 'local';

interface RuntimeStatus {
  isComplete: boolean;
  isRunning: boolean;
  isRewound: boolean;
  pauseReason: RuntimePause | null;
}

interface RuntimeView extends RuntimeState, RuntimeStatus {
  version: number;
  historyLength: number;
  historyIndex: number;
  isPaused: boolean;
}

export type RuntimeMode =
  | 'idle'
  | 'running'
  | 'input'
  | 'breakpoint'
  | 'rewound'
  | 'continuable';

interface RuntimeEnvironment {
  host: BrowserPresentationHost;
  interpreter: Interpreter;
  history: RuntimeHistory;
  store: ReturnType<typeof createInterpreterStore>;
}

interface OutputPresence {
  hasGraphicsOutput: boolean;
  hasTextOutput: boolean;
}

interface RuntimeControls {
  canEditInspectorValues: boolean;
  isRunDisabled: boolean;
  isStepDisabled: boolean;
  isStopDisabled: boolean;
  isEditorReadOnly: boolean;
  runLabel: 'Continue' | 'Run';
}

function getRuntimeMode(status: RuntimeStatus): RuntimeMode {
  if (status.isRunning) {
    return 'running';
  } else if (status.pauseReason?.kind === 'input') {
    return 'input';
  } else if (status.pauseReason) {
    return 'breakpoint';
  } else if (status.isRewound) {
    return 'rewound';
  } else if (!status.isComplete) {
    return 'continuable';
  } else {
    return 'idle';
  }
}

function isRuntimeModeActive(mode: RuntimeMode) {
  return mode !== 'idle';
}

function isRuntimeModeEditable(mode: RuntimeMode) {
  return mode === 'breakpoint' || mode === 'rewound' || mode === 'continuable';
}

function isRuntimeModeRunnable(mode: RuntimeMode) {
  return mode !== 'running' && mode !== 'input';
}

function isRuntimeModeContinuable(mode: RuntimeMode) {
  return mode === 'breakpoint' || mode === 'rewound' || mode === 'continuable';
}

function getRuntimeControls(mode: RuntimeMode): RuntimeControls {
  const isActive = isRuntimeModeActive(mode);

  return {
    canEditInspectorValues: isRuntimeModeEditable(mode),
    isRunDisabled: !isRuntimeModeRunnable(mode),
    isStepDisabled: mode !== 'breakpoint' && mode !== 'idle',
    isStopDisabled: !isActive,
    isEditorReadOnly: isActive,
    runLabel: isRuntimeModeContinuable(mode) ? 'Continue' : 'Run',
  };
}

function getRuntimeStatus(
  interpreter: Interpreter,
  history: RuntimeHistory
): RuntimeStatus {
  return {
    isComplete: interpreter.isComplete,
    isRunning: interpreter.isRunning,
    isRewound: history.isRewound,
    pauseReason: interpreter.pauseReason,
  };
}

function createInterpreterStore(
  interpreter: Interpreter,
  history: RuntimeHistory
) {
  const events = new EventTarget();
  let version = 0;

  function readView(): RuntimeView {
    return {
      version,
      ...interpreter.captureState(),
      historyLength: history.length,
      historyIndex: history.index,
      isComplete: interpreter.isComplete,
      isRunning: interpreter.isRunning,
      isPaused: interpreter.isPaused,
      isRewound: history.isRewound,
      pauseReason: interpreter.pauseReason,
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

function createRuntimeEnvironment(): RuntimeEnvironment {
  const host = new BrowserPresentationHost();
  const interpreter = new Interpreter();
  const history = new RuntimeHistory();

  interpreter.registerGlobals(buildBrowserGlobals(host));
  interpreter.registerGlobals(runtimeGlobals);
  interpreter.registerSnapshotHandler(host);
  interpreter.registerConfigurationHandler((option, value) =>
    host.setConfiguration(option, value)
  );

  return {
    host,
    interpreter,
    history,
    store: createInterpreterStore(interpreter, history),
  };
}

function useRuntimeEnvironment() {
  const runtimeRef = useRef<RuntimeEnvironment | null>(null);

  if (runtimeRef.current === null) {
    runtimeRef.current = createRuntimeEnvironment();
  }

  return runtimeRef.current;
}

function getOutputPresence(
  host: BrowserPresentationHost,
  hasInput: boolean
): OutputPresence {
  return {
    hasGraphicsOutput:
      host.shapes.length > 0 || host.currentGroup.head !== rootShapeGroup,
    hasTextOutput:
      host.cells.length > 0 || host.currentCell.head !== rootCell || hasInput,
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

function normalizeError(err: unknown) {
  return err instanceof Error ? err : new Error(String(err));
}

function setInspectorVariable(
  interpreter: Interpreter,
  scope: InspectorScope,
  name: string,
  indexes: readonly IndexType[],
  value: unknown
) {
  if (scope === 'global') {
    if (indexes.length > 0) {
      interpreter.setGlobalVariableIndex(name, indexes, value);
    } else {
      interpreter.setGlobalVariable(name, value);
    }
  } else {
    if (indexes.length > 0) {
      interpreter.setLocalVariableIndex(name, indexes, value);
    } else {
      interpreter.setLocalVariable(name, value);
    }
  }
}

function deleteInspectorVariable(
  interpreter: Interpreter,
  scope: InspectorScope,
  name: string,
  indexes: readonly IndexType[]
) {
  if (scope === 'global') {
    if (indexes.length > 0) {
      interpreter.deleteGlobalVariableIndex(name, indexes);
    } else {
      interpreter.deleteGlobalVariable(name);
    }
  } else {
    if (indexes.length > 0) {
      interpreter.deleteLocalVariableIndex(name, indexes);
    } else {
      interpreter.deleteLocalVariable(name);
    }
  }
}

export function useStartEnvironment() {
  const { highlightLine, parseProgram } = useEditor();

  const [outputTab, setOutputTab] = useState<OutputTab>('graphics');
  const [showInspector, setShowInspector] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const { host, interpreter, history, store } = useRuntimeEnvironment();
  const runtimeView = useSyncExternalStore(store.subscribe, store.getView);
  const runtimeMode = getRuntimeMode(runtimeView);
  const runtimeControls = useMemo(
    () => getRuntimeControls(runtimeMode),
    [runtimeMode]
  );

  const syncOutputTab = useCallback(() => {
    const { hasGraphicsOutput, hasTextOutput } = getOutputPresence(
      host,
      interpreter.pauseReason?.kind === 'input'
    );

    setOutputTab((current) =>
      chooseOutputTab(current, hasGraphicsOutput, hasTextOutput)
    );
  }, [host, interpreter]);

  const syncHighlight = useCallback(() => {
    const mode = getRuntimeMode(getRuntimeStatus(interpreter, history));
    if (isRuntimeModeEditable(mode)) {
      highlightLine(interpreter.topFrame.head.node.location.start.line);
    } else {
      highlightLine(null);
    }
  }, [highlightLine, history, interpreter]);

  const finishInterpreterAction = useCallback(() => {
    syncOutputTab();
    syncHighlight();
    store.publish();
  }, [store, syncHighlight, syncOutputTab]);

  const finishRuntimeError = useCallback(
    (error: Error) => {
      syncOutputTab();
      if (error instanceof RuntimeError) {
        highlightLine(error.node.location.start.line, 'error');
      } else {
        syncHighlight();
      }
      store.publish();
    },
    [highlightLine, store, syncHighlight, syncOutputTab]
  );

  const handleRuntimeEffect = useCallback(
    (effect: RuntimeEffect) => {
      switch (effect.kind) {
        case 'snapshot': {
          history.push(interpreter.captureState());
          return;
        }
        case 'repaint': {
          syncOutputTab();
          store.publish();
          return new Promise<void>((resolve) => {
            requestAnimationFrame(() => resolve());
          });
        }
        case 'delay': {
          return new Promise<void>((resolve) => {
            setTimeout(resolve, effect.ms);
          });
        }
      }
    },
    [history, interpreter, store, syncOutputTab]
  );

  useEffect(() => {
    interpreter.registerEffectHandler(handleRuntimeEffect);
    return () => {
      interpreter.registerEffectHandler(null);
    };
  }, [handleRuntimeEffect, interpreter]);

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

  const captureFinalState = useCallback(
    (result: RunResult) => {
      if (result.status === 'completed') {
        history.push(interpreter.captureState());
      }
    },
    [history, interpreter]
  );

  const performInterpreterAction = useCallback(
    async (
      action: () => Promise<RunResult>,
      options: { clearHighlight?: boolean } = {}
    ) => {
      setError(null);
      if (options.clearHighlight ?? true) {
        highlightLine(null);
      }

      try {
        const promise = action();
        // Update the UI before awaiting
        store.publish();
        const result = await promise;
        captureFinalState(result);
        finishInterpreterAction();
      } catch (err) {
        // Ignore stale continuations
        if (err instanceof AbortedError) {
          return;
        }
        const error = normalizeError(err);
        interpreter.stop();
        captureFinalState({ status: 'completed' });
        setError(error);
        setShowInspector(true);
        finishRuntimeError(error);
      }
    },
    [
      captureFinalState,
      finishInterpreterAction,
      finishRuntimeError,
      highlightLine,
      interpreter,
      store,
    ]
  );

  const resumeInput = useCallback(
    async (value: string) => {
      await performInterpreterAction(
        () => interpreter.resume({ input: value }),
        {
          clearHighlight: false,
        }
      );
    },
    [interpreter, performInterpreterAction]
  );

  const inputState = useMemo(
    () =>
      runtimeView.pauseReason?.kind === 'input'
        ? {
            prompt: runtimeView.pauseReason.prompt,
            initial: runtimeView.pauseReason.initial,
            onInputComplete: resumeInput,
          }
        : null,
    [runtimeView.pauseReason, resumeInput]
  );

  const { hasGraphicsOutput, hasTextOutput } = getOutputPresence(
    host,
    inputState !== null
  );

  const updateSlider = useCallback(
    (index: number) => {
      interpreter.restoreState(history.moveTo(index));
      finishInterpreterAction();
    },
    [finishInterpreterAction, history, interpreter]
  );

  const startProgram = useCallback(
    async (runParsedProgram: (program: Program) => Promise<RunResult>) => {
      let parsed: ReturnType<typeof parseProgram>;
      try {
        parsed = parseProgram();
      } catch (err) {
        setError(normalizeError(err));
        setShowInspector(true);
        highlightLine(null);
        return;
      }

      history.clear();
      host.restoreOriginalSettings();

      await performInterpreterAction(() => {
        interpreter.setMarkerMap(parsed.markerMap);
        return runParsedProgram(parsed.program);
      });
    },
    [
      highlightLine,
      history,
      host,
      interpreter,
      parseProgram,
      performInterpreterAction,
    ]
  );

  const runProgram = useCallback(async () => {
    await startProgram((node) => interpreter.run(node));
  }, [interpreter, startProgram]);

  const stepToNextStatement = useCallback(async () => {
    switch (runtimeMode) {
      case 'idle':
        await startProgram((node) => interpreter.run(node, { step: true }));
        return;
      case 'breakpoint':
        await performInterpreterAction(() =>
          interpreter.resume({ step: true })
        );
        return;
      case 'continuable':
      case 'input':
      case 'rewound':
      case 'running':
        return;
    }
  }, [interpreter, performInterpreterAction, runtimeMode, startProgram]);

  const stopProgram = useCallback(() => {
    setError(null);
    interpreter.stop();
    history.clear();
    highlightLine(null);
    finishInterpreterAction();
  }, [finishInterpreterAction, highlightLine, history, interpreter]);

  const commitInspectorMutation = useCallback(
    (message: string, mutate: () => void) => {
      if (history.isRewound && !window.confirm(message)) {
        return false;
      }

      setError(null);
      mutate();
      history.replaceCurrent(interpreter.captureState());
      finishInterpreterAction();
      return true;
    },
    [finishInterpreterAction, history, interpreter]
  );

  const updateInspectorValue = useCallback(
    (
      scope: InspectorScope,
      name: string,
      indexes: readonly IndexType[],
      value: unknown
    ) => {
      return commitInspectorMutation(
        'Changing this value will discard later snapshots and continue from here.',
        () => {
          setInspectorVariable(interpreter, scope, name, indexes, value);
        }
      );
    },
    [commitInspectorMutation, interpreter]
  );

  const deleteInspectorValue = useCallback(
    (scope: InspectorScope, name: string, indexes: readonly IndexType[]) => {
      return commitInspectorMutation(
        'Deleting this value will discard later snapshots and continue from here.',
        () => {
          deleteInspectorVariable(interpreter, scope, name, indexes);
        }
      );
    },
    [commitInspectorMutation, interpreter]
  );

  const runOrResume = useCallback(() => {
    switch (runtimeMode) {
      case 'breakpoint':
        return performInterpreterAction(() => interpreter.resume());
      case 'rewound':
      case 'continuable':
        return performInterpreterAction(() => {
          history.truncateAfterCurrent();
          return interpreter.resume();
        });
      case 'idle':
      case 'running':
      case 'input':
        return runProgram();
    }
  }, [history, interpreter, performInterpreterAction, runProgram, runtimeMode]);

  return {
    error,
    hasGraphicsOutput,
    hasTextOutput,
    history,
    host,
    inputState,
    interpreter,
    outputTab,
    runtimeMode,
    runtimeVersion: runtimeView.version,
    runProgram,
    runOrResume,
    setOutputTab,
    setShowInspector,
    showInspector,
    stopProgram,
    stepToNextStatement,
    deleteInspectorValue,
    updateInspectorValue,
    updateSlider,
    ...runtimeControls,
  };
}
