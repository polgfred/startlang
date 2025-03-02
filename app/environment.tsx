import { createContext, useContext, type ReactNode } from 'react';

import { BrowserHost } from '../src/lang/ext/browser';
import { Interpreter } from '../src/lang/interpreter';

const EnvironmentContext = createContext<{
  interpreter: Interpreter;
  host: BrowserHost;
  runProgram: () => Promise<void>;
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
  interpreter,
  host,
  runProgram,
  loadProgram,
  children,
}: {
  interpreter: Interpreter;
  host: BrowserHost;
  runProgram: () => Promise<void>;
  loadProgram: (source: string | null) => void;
  children: ReactNode;
}) {
  return (
    <EnvironmentContext.Provider
      value={{ interpreter, host, runProgram, loadProgram }}
    >
      {children}
    </EnvironmentContext.Provider>
  );
}
