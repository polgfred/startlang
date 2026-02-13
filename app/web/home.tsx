'use client';

import { editor } from 'monaco-editor';
import { useCallback, useEffect, useRef, useState } from 'react';

import { serializeCurrentState } from '../../src/desktop/serialize.js';
import type { EngineSnapshotState, ViewMode } from '../../src/desktop/types.js';
import { BrowserHost, browserGlobals } from '../../src/lang/ext/browser.js';
import { Interpreter } from '../../src/lang/interpreter.js';
import { parse } from '../../src/lang/parser.peggy';
import Workbench from '../common/workbench.jsx';
import type { InputState } from '../term.jsx';

import HeaderWeb from './header.jsx';

function usePromptForInput() {
  const [inputState, setInputState] = useState<InputState | null>(null);

  return {
    inputState,

    promptForInput(
      interpreter: Interpreter,
      [prompt, initial = '']: [string, string]
    ) {
      return new Promise<void>((resolve) => {
        setInputState({
          prompt,
          initial,
          onInputComplete(value: string) {
            setInputState(null);
            interpreter.setResult(value);
            resolve();
          },
        });
      });
    },
  };
}

export default function HomeWeb() {
  const editorRef = useRef<editor.ICodeEditor | null>(null);
  const [showInspector, setShowInspector] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [state, setState] = useState<EngineSnapshotState | null>(null);

  const [, setRenderTick] = useState(0);
  const forceRender = useCallback(() => {
    setRenderTick((tick) => tick + 1);
  }, []);

  const { inputState, promptForInput } = usePromptForInput();

  const { current: host } = useRef(new BrowserHost());
  const { current: interpreter } = useRef(new Interpreter(host));
  const hasRegisteredGlobals = useRef(false);

  if (!hasRegisteredGlobals.current) {
    interpreter.registerGlobals(browserGlobals);
    interpreter.registerGlobals({ input: promptForInput });
    hasRegisteredGlobals.current = true;
  }

  useEffect(() => {
    host.events.on('repaint', forceRender);
    setState(serializeCurrentState(interpreter, host));
    return () => {
      host.events.off('repaint', forceRender);
    };
  }, [forceRender, host, interpreter]);

  const getSource = useCallback(() => {
    return editorRef.current?.getValue() ?? '';
  }, []);

  const runProgram = useCallback(async () => {
    setError(null);
    setIsRunning(true);

    interpreter.clearHistory();
    host.clearDisplay();
    host.clearOutputBuffer();

    try {
      host.restoreOriginalSettings();
      const rootNode = parse(`${getSource()}\n`);
      await interpreter.run(rootNode);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err);
        // eslint-disable-next-line no-console
        console.error(err.stack);
      }
    } finally {
      setIsRunning(false);
      setState(serializeCurrentState(interpreter, host));
      forceRender();
    }
  }, [forceRender, getSource, host, interpreter]);

  const updateSlider = useCallback(
    (index: number) => {
      interpreter.moveToSnapshot(index);
      setState(serializeCurrentState(interpreter, host));
      forceRender();
    },
    [forceRender, host, interpreter]
  );

  const handleSetViewMode = useCallback(
    (mode: ViewMode) => {
      host.setViewMode(mode);
      setState((prev) => (prev ? { ...prev, viewMode: mode } : prev));
      forceRender();
    },
    [forceRender, host]
  );

  return (
    <Workbench
      header={
        <HeaderWeb
          viewMode={state?.viewMode ?? 'graphics'}
          setViewMode={handleSetViewMode}
          isRunning={isRunning}
          showInspector={showInspector}
          setShowInspector={setShowInspector}
          editorRef={editorRef}
          runProgram={runProgram}
        />
      }
      state={state}
      error={error}
      showInspector={showInspector}
      updateSlider={updateSlider}
      editorRef={editorRef}
      runProgram={runProgram}
      inputState={inputState}
    />
  );
}
