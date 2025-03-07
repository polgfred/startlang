import { Interpreter } from '../interpreter.js';

import { Frame, Node } from './base.js';

export class UnaryOpNode extends Node {
  constructor(
    public readonly operator: string,
    public readonly right: Node
  ) {
    super();
  }

  makeFrame() {
    return new UnaryOpFrame(this);
  }
}

export class UnaryOpFrame extends Frame {
  declare node: UnaryOpNode;

  visit(interpreter: Interpreter) {
    const { operator, right } = this.node;

    switch (this.state) {
      case 0: {
        interpreter.swapFrame(this, 1);
        interpreter.pushFrame(right);
        break;
      }
      case 1: {
        const result = interpreter.lastResult;
        interpreter.setResult(interpreter.evalUnaryOp(operator, result));
        interpreter.popFrame();
        break;
      }
    }
  }
}
