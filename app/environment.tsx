import { createContext, useContext, useRef, type ReactNode } from 'react';

import { browserGlobals, BrowserHost } from '../src/lang/ext/browser.js';
import { Interpreter } from '../src/lang/interpreter.js';

import { useEditor } from './monaco.jsx';

const EnvironmentContext = createContext<{
  interpreter: Interpreter;
  host: BrowserHost;
  runProgram: () => void;
  loadProgram: (source: string | null) => void;
} | null>(null);

export function useEnvironment() {
  const context = useContext(EnvironmentContext);
  if (!context) {
    throw new Error('Interpreter not found');
  }
  return context;
}

export default function EnvironmentProvider({
  children,
}: {
  children: ReactNode;
}) {
  const { getMarkers, parseValue, setValue } = useEditor();

  const { current: host } = useRef(new BrowserHost());
  const { current: interpreter } = useRef(new Interpreter(host));

  interpreter.registerGlobals(browserGlobals);

  function runProgram() {
    interpreter.clearHistory();
    interpreter.lastResult = null;
    interpreter.lastError = null;

    host.restoreOriginalSettings();
    host.clearDisplay();
    host.clearOutputBuffer();

    const rootNode = parseValue();
    interpreter.setMarkers(rootNode, getMarkers());
    interpreter.run(rootNode);
  }

  function loadProgram(source: string | null) {
    setValue(source);
    if (source) {
      runProgram();
    }
  }

  return (
    <EnvironmentContext.Provider
      value={{ interpreter, host, runProgram, loadProgram }}
    >
      {children}
    </EnvironmentContext.Provider>
  );
}
