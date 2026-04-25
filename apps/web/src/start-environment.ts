import {
  BrowserPresentationHost,
  browserPresentationGlobals,
} from '@startlang/lang-browser/browser';
import { Interpreter } from '@startlang/lang-core/interpreter';
import { runtimeGlobals } from '@startlang/lang-core/runtime-globals';
import {
  BreakpointSuspension,
  InputSuspension,
} from '@startlang/lang-core/suspension';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { useEditor } from './editor-context.jsx';

type OutputTab = 'graphics' | 'text';

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

function useForceRender() {
  const [, setTick] = useState(0);

  return useCallback(() => {
    setTick((tick) => tick + 1);
  }, []);
}

export function useStartEnvironment() {
  const { getMarkers, highlightNode, parseValue } = useEditor();

  const [outputTab, setOutputTab] = useState<OutputTab>('graphics');
  const [showInspector, setShowInspector] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const forceRender = useForceRender();

  const { current: host } = useRef(new BrowserPresentationHost());
  const { current: interpreter } = useRef(new Interpreter(host));
  const globalsRegisteredRef = useRef(false);

  if (!globalsRegisteredRef.current) {
    interpreter.registerGlobals(browserPresentationGlobals);
    interpreter.registerGlobals(runtimeGlobals);
    globalsRegisteredRef.current = true;
  }

  useEffect(() => {
    host.events.addEventListener('repaint', forceRender);
    return () => {
      host.events.removeEventListener('repaint', forceRender);
    };
  }, [forceRender, host]);

  const syncOutputTab = useCallback(() => {
    const nextHasGraphicsOutput = host.shapes.length > 0;
    const nextHasTextOutput =
      host.outputBuffer.children.length > 0 ||
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
    forceRender();
  }, [forceRender, syncHighlight, syncOutputTab]);

  const resumeInput = useCallback(
    async (value: string) => {
      setError(null);

      try {
        await interpreter.resumeSuspension(value);
      } catch (err: unknown) {
        if (err instanceof Error) {
          setError(err);
          // eslint-disable-next-line no-console
          console.error(err.stack);
        }
      } finally {
        finishInterpreterAction();
      }
    },
    [finishInterpreterAction, interpreter]
  );

  const inputState = useMemo(
    () =>
      interpreter.suspension instanceof InputSuspension
        ? {
            prompt: interpreter.suspension.prompt,
            initial: interpreter.suspension.initial,
            onInputComplete: resumeInput,
          }
        : null,
    [interpreter.suspension, resumeInput]
  );

  const hasGraphicsOutput = host.shapes.length > 0;
  const hasTextOutput =
    host.outputBuffer.children.length > 0 || inputState !== null;

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
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err);
        // eslint-disable-next-line no-console
        console.error(err.stack);
      }
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
      await interpreter.resumeSuspension(undefined);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err);
        // eslint-disable-next-line no-console
        console.error(err.stack);
      }
    } finally {
      finishInterpreterAction();
    }
  }, [finishInterpreterAction, interpreter]);

  const isBreakpointSuspended =
    interpreter.suspension instanceof BreakpointSuspension;
  const isInputSuspended = interpreter.suspension instanceof InputSuspension;
  const runOrResume = useCallback(() => {
    if (interpreter.suspension instanceof BreakpointSuspension) {
      return resumeBreakpoint();
    }
    return runProgram();
  }, [interpreter, resumeBreakpoint, runProgram]);

  return {
    error,
    hasGraphicsOutput,
    hasTextOutput,
    host,
    inputState,
    interpreter,
    isRunDisabled: interpreter.isRunning || isInputSuspended,
    outputTab,
    runLabel: isBreakpointSuspended ? 'Continue' : 'Run',
    runOrResume,
    setOutputTab,
    setShowInspector,
    showInspector,
    updateSlider,
  };
}
