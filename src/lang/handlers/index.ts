import { BooleanHandler } from './boolean';
import { ListHandler } from './list';
import { NoneHandler } from './none';
import { NumberHandler } from './number';
import { StringHandler } from './string';
import { TableHandler } from './table';

import { Interpreter } from '../interpreter';

export { DataHandler } from './base';

export function installHandlers(this: Interpreter) {
  this.registerHandler(new NoneHandler(this));
  this.registerHandler(new BooleanHandler(this));
  this.registerHandler(new NumberHandler(this));
  this.registerHandler(new StringHandler(this));
  this.registerHandler(new ListHandler(this));
  this.registerHandler(new TableHandler(this));
}
