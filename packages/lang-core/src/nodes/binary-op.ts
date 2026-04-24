import { Interpreter } from '../interpreter.js';

import { Frame, Node, SourceLocation } from './base.js';

export class BinaryOpNode extends Node {
  constructor(
    location: SourceLocation,
    public readonly operator: string,
    public readonly left: Node,
    public readonly right: Node
  ) {
    super(location);
  }

  makeFrame() {
    return new BinaryOpFrame(this);
  }
}

export class BinaryOpFrame extends Frame {
  declare node: BinaryOpNode;

  readonly left: unknown;

  visit(interpreter: Interpreter) {
    const { operator, left, right } = this.node;

    switch (this.state) {
      case 0: {
        interpreter.swapFrame(this, 1);
        interpreter.pushFrame(left);
        break;
      }
      case 1: {
        interpreter.swapFrame(this, 2, (draft) => {
          draft.left = interpreter.lastResult;
        });
        interpreter.pushFrame(right);
        break;
      }
      case 2: {
        const result = interpreter.lastResult;
        interpreter.setResult(
          interpreter.evalBinaryOp(operator, this.left, result)
        );
        interpreter.popFrame();
        break;
      }
    }
  }
}
