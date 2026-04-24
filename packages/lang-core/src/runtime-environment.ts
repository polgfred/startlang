import type { RuntimeEnvironment } from './host.js';
import type { RuntimeFunctions } from './types.js';

export function runtimeEnvironmentGlobals(
  environment: RuntimeEnvironment
): RuntimeFunctions {
  return {
    async input(interpreter, [prompt, initial = '']: [string, string]) {
      if (!environment.promptForInput) {
        throw new Error('input is not supported by this runtime environment');
      }

      interpreter.setResult(await environment.promptForInput(prompt, initial));
    },
  };
}
