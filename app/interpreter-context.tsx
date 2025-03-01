import { createContext, useContext, type ReactNode } from 'react';

import { BrowserHost } from '../src/lang/ext/browser';
import { Interpreter } from '../src/lang/interpreter';

const InterpreterContext = createContext<Interpreter | null>(null);

export function useInterpreter() {
  const interpreter = useContext(InterpreterContext);
  if (!interpreter) {
    throw new Error('Interpreter not found');
  }
  if (!(interpreter.host instanceof BrowserHost)) {
    throw new Error('BrowserHost not found');
  }
  return { interpreter, host: interpreter.host };
}

export default function InterpreterProvider({
  interpreter,
  children,
}: {
  interpreter: Interpreter;
  children: ReactNode;
}) {
  return (
    <InterpreterContext.Provider value={interpreter}>
      {children}
    </InterpreterContext.Provider>
  );
}
