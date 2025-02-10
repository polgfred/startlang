import { Interpreter } from '../interpreter';

import { Frame, Node } from './base';

export class ExitNode extends Node {
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
