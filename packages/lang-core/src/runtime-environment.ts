import { InputSuspension } from './suspension.js';
import type { RuntimeFunctions } from './types.js';

export function runtimeEnvironmentGlobals(): RuntimeFunctions {
  return {
    input(interpreter, [prompt, initial = '']: [string, string]) {
      return new InputSuspension(prompt, initial);
    },
  };
}
