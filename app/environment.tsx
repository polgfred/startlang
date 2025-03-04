import {
  createContext,
  useCallback,
  useContext,
  useRef,
  type ReactNode,
} from 'react';

import { browserGlobals, BrowserHost } from '../src/lang/ext/browser';
import { Interpreter } from '../src/lang/interpreter';

import { useEditor } from './monaco';

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

  const runProgram = useCallback(() => {
    interpreter.clearHistory();
    interpreter.lastResult = null;
    interpreter.lastError = null;

    host.restoreOriginalSettings();
    host.clearDisplay();
    host.clearOutputBuffer();

    const rootNode = parseValue();
    interpreter.setMarkers(rootNode, getMarkers());
    interpreter.run(rootNode);
  }, [getMarkers, host, interpreter, parseValue]);

  const loadProgram = useCallback(
    (source: string | null) => {
      setValue(source);
      if (source) {
        runProgram();
      }
    },
    [runProgram, setValue]
  );

  return (
    <EnvironmentContext.Provider
      value={{ interpreter, host, runProgram, loadProgram }}
    >
      {children}
    </EnvironmentContext.Provider>
  );
}
