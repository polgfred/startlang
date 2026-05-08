import { Interpreter } from '../interpreter.js';

import { Frame, Node } from './base.js';

export class ExitNode extends Node {
  override readonly isStatement = true;

  makeFrame() {
    return new ExitFrame(this);
  }
}

export class ExitFrame extends Frame {
  declare node: ExitNode;

  visit(interpreter: Interpreter) {
    interpreter.popOut();
  }
}
