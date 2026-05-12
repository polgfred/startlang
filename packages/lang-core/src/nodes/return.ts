import { Interpreter } from '../interpreter.js';

import { Frame, Node } from './base.js';

export class ReturnNode extends Node {
  override readonly isStatement = true;

  constructor(public readonly result: Node | null) {
    super();
  }

  makeFrame() {
    if (this.result === null) {
      return new ReturnFrame(this);
    } else {
      return new ReturnValueFrame(this);
    }
  }
}

export class ReturnFrame extends Frame {
  declare node: ReturnNode;

  visit(interpreter: Interpreter) {
    interpreter.unwind('return');
  }
}

export class ReturnValueFrame extends Frame {
  declare node: ReturnNode;

  visit(interpreter: Interpreter) {
    switch (this.state) {
      case 0: {
        interpreter.swapFrame(1);
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        interpreter.pushNode(this.node.result!);
        break;
      }
      case 1: {
        interpreter.unwind('return');
        break;
      }
    }
  }
}
