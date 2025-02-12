import { Interpreter } from '../interpreter.js';

import { BooleanHandler } from './boolean.js';
import { ListHandler } from './list.js';
import { NoneHandler } from './none.js';
import { NumberHandler } from './number.js';
import { StringHandler } from './string.js';
import { TableHandler } from './table.js';

export { DataHandler } from './base.js';

export function installHandlers(interpreter: Interpreter) {
  interpreter.registerHandler(new NoneHandler(interpreter));
  interpreter.registerHandler(new BooleanHandler(interpreter));
  interpreter.registerHandler(new NumberHandler(interpreter));
  interpreter.registerHandler(new StringHandler(interpreter));
  interpreter.registerHandler(new ListHandler(interpreter));
  interpreter.registerHandler(new TableHandler(interpreter));
}
