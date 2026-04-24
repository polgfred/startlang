import { InputSuspension } from './suspension.js';
import type { RuntimeFunctions } from './types.js';

export const runtimeGlobals: RuntimeFunctions = {
  input(interpreter, [prompt, initial = '']: [string, string]) {
    return new InputSuspension(prompt, initial);
  },
};
