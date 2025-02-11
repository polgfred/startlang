import { Interpreter } from '../interpreter.js';

import { Frame, Node } from './base.js';

export class NextNode extends Node {
  makeFrame() {
    return new NextFrame(this);
  }
}

export class NextFrame extends Frame {
  declare node: NextNode;

  visit(interpreter: Interpreter) {
    interpreter.popUntil('loop');
  }
}
