import { Interpreter } from '../interpreter';

import { Frame, ValueNode } from './base';

export class BinaryOpNode extends ValueNode {
  constructor(
    public readonly operator: string,
    public readonly left: ValueNode,
    public readonly right: ValueNode
  ) {
    super();
  }

  makeFrame() {
    return new BinaryOpFrame(this);
  }
}

export class BinaryOpFrame extends Frame {
  declare node: BinaryOpNode;

  readonly left: any;

  visit(interpreter: Interpreter) {
    switch (this.state) {
      case 0: {
        interpreter.updateFrame(this, 1);
        interpreter.pushFrame(this.node.left);
        break;
      }
      case 1: {
        interpreter.updateFrame(this, 2, (draft) => {
          draft.left = interpreter.lastResult;
        });
        interpreter.pushFrame(this.node.right);
        break;
      }
      case 2: {
        const right = interpreter.lastResult;
        interpreter.lastResult = interpreter.evalBinaryOp(
          this.node.operator,
          this.left,
          right
        );
        interpreter.popFrame();
      }
    }
  }
}
