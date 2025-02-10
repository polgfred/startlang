import { Interpreter } from '../interpreter';

import { Frame, Node } from './base';

export class BreakNode extends Node {
  makeFrame() {
    return new BreakFrame(this);
  }
}

export class BreakFrame extends Frame {
  declare node: BreakNode;

  visit(interpreter: Interpreter) {
    interpreter.popOver('loop');
  }
}
