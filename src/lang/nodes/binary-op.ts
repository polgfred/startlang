import { Interpreter } from '../interpreter';

import { Frame, ValueNode } from './base';

export class BinaryOpNode extends ValueNode {
  constructor(
    public operator: string,
    public left: ValueNode,
    public right: ValueNode
  ) {
    super();
  }

  makeFrame() {
    return new BinaryOpFrame(this);
  }
}

export class BinaryOpFrame extends Frame {
  left: any;

  constructor(public node: BinaryOpNode) {
    super();
  }

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
        const handler = interpreter.getHandler(this.left);
        interpreter.lastResult = handler.evalBinaryOp(
          this.node.operator,
          this.left,
          right
        );
        interpreter.popFrame();
      }
    }
  }
}
