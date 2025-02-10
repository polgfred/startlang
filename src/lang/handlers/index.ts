import { BooleanHandler } from './boolean';
import { ListHandler } from './list';
import { NoneHandler } from './none';
import { NumberHandler } from './number';
import { StringHandler } from './string';
import { TableHandler } from './table';

import { Interpreter } from '../interpreter';

export { DataHandler } from './base';

export function installHandlers(interpreter: Interpreter) {
  interpreter.registerHandler(new NoneHandler(interpreter));
  interpreter.registerHandler(new BooleanHandler(interpreter));
  interpreter.registerHandler(new NumberHandler(interpreter));
  interpreter.registerHandler(new StringHandler(interpreter));
  interpreter.registerHandler(new ListHandler(interpreter));
  interpreter.registerHandler(new TableHandler(interpreter));
}
