import { Interpreter } from '../interpreter.js';

import { Frame, Node } from './base.js';

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
