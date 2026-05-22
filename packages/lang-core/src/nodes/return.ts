import { Interpreter } from '../interpreter.js';

import { Frame, Node } from './base.js';

export class ReturnNode extends Node {
  override readonly isStatement = true;

  constructor(public readonly result: Node | null) {
    super();
  }

  makeFrame() {
    return new ReturnFrame(this);
  }
}

export class ReturnFrame extends Frame {
  declare node: ReturnNode;

  visit(interpreter: Interpreter) {
    switch (this.state) {
      case 0: {
        interpreter.swapFrame(1);
        if (this.node.result) {
          interpreter.pushNode(this.node.result);
        }
        break;
      }
      case 1: {
        interpreter.unwind('return');
        break;
      }
    }
  }
}
