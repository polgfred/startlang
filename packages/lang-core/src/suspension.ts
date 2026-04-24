import type { Interpreter } from './interpreter.js';

export abstract class RuntimeSuspension<TResponse = unknown> {
  abstract readonly kind: string;

  abstract resume(interpreter: Interpreter, response: TResponse): void;
}

export class InputSuspension extends RuntimeSuspension<string> {
  readonly kind = 'input';

  constructor(
    readonly prompt: string,
    readonly initial: string
  ) {
    super();
  }

  resume(interpreter: Interpreter, response: string) {
    interpreter.setResult(response);
  }
}

export class BreakpointSuspension extends RuntimeSuspension<void> {
  readonly kind = 'breakpoint';

  resume() {}
}

export function isRuntimeSuspension(
  value: unknown
): value is RuntimeSuspension {
  return value instanceof RuntimeSuspension;
}
