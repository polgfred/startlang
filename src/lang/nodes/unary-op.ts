import { Interpreter } from '../interpreter';

import { Frame, Node } from './base';

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
    switch (this.state) {
      case 0: {
        interpreter.updateFrame(this, 1);
        interpreter.pushFrame(this.node.right);
        break;
      }
      case 1: {
        const right = interpreter.lastResult;
        interpreter.lastResult = interpreter.evalUnaryOp(
          this.node.operator,
          right
        );
        interpreter.popFrame();
      }
    }
  }
}
