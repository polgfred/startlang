import { Interpreter } from '../interpreter';

import { Frame, Node } from './base';

export class ReturnNode extends Node {
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
    interpreter.popOver('call');
  }
}

export class ReturnValueFrame extends Frame {
  declare node: ReturnNode;

  visit(interpreter: Interpreter) {
    switch (this.state) {
      case 0: {
        interpreter.swapFrame(this, 1);
        interpreter.pushFrame(this.node.result!);
        break;
      }
      case 1: {
        interpreter.popOver('call');
        break;
      }
    }
  }
}
