import { Interpreter } from '../interpreter';

import { Frame, StatementNode, ValueNode } from './base';

export class IfNode extends StatementNode {
  constructor(
    public condition: ValueNode,
    public thenBody: StatementNode,
    public elseBody: StatementNode | null = null
  ) {
    super();
  }

  makeFrame() {
    return new IfFrame(this);
  }
}

export class IfFrame extends Frame {
  constructor(public node: IfNode) {
    super();
  }

  visit(interpreter: Interpreter) {
    switch (this.state) {
      case 0: {
        interpreter.updateFrame(this, 1);
        interpreter.pushNode(this.node.condition);
        break;
      }
      case 1: {
        interpreter.updateFrame(this, 2);
        if (Boolean(interpreter.lastResult)) {
          interpreter.pushNode(this.node.thenBody);
        } else if (this.node.elseBody !== null) {
          interpreter.pushNode(this.node.elseBody);
        }
        break;
      }
      case 2: {
        interpreter.popNode();
        break;
      }
    }
  }
}
