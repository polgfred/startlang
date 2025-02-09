import { Interpreter } from '../interpreter';

import { Frame, ValueNode } from './base';

export class UnaryOpNode extends ValueNode {
  constructor(
    public operator: string,
    public right: ValueNode
  ) {
    super();
  }

  makeFrame() {
    return new UnaryOpFrame(this);
  }
}

export class UnaryOpFrame extends Frame {
  constructor(public node: UnaryOpNode) {
    super();
  }

  visit(interpreter: Interpreter) {
    switch (this.state) {
      case 0: {
        interpreter.updateFrame(this, 1);
        interpreter.pushFrame(this.node.right);
        break;
      }
      case 1: {
        const right = interpreter.lastResult;
        const handler = interpreter.getHandler(right);
        interpreter.lastResult = handler.evalUnaryOp(this.node.operator, right);
        interpreter.popFrame();
      }
    }
  }
}
