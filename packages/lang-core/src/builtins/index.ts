import type { Interpreter } from '../interpreter.js';

import { collectionFunctions } from './collections.js';
import { coreFunctions } from './core.js';
import { mathFunctions } from './math.js';
import { textFunctions } from './text.js';

export function installBuiltins(interpreter: Interpreter) {
  interpreter.registerGlobals(coreFunctions);
  interpreter.registerGlobals(mathFunctions);
  interpreter.registerGlobals(textFunctions);
  interpreter.registerGlobals(collectionFunctions);
}
