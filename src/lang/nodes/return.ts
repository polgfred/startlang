import { Interpreter } from '../interpreter';
import { Frame, StatementNode, ValueNode } from './base';

export class ReturnNode extends StatementNode {
  constructor(public result: ValueNode | null) {
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
  constructor(public node: ReturnNode) {
    super();
  }

  visit(interpreter: Interpreter) {
    interpreter.popOver('call');
  }
}

export class ReturnValueFrame extends Frame {
  constructor(public node: ReturnNode) {
    super();
  }

  visit(interpreter: Interpreter) {
    switch (this.state) {
      case 0: {
        interpreter.updateFrame(this, 1);
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
