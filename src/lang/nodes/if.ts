import { Interpreter } from '../interpreter';

import { Frame, StatementNode, ValueNode } from './base';

export class IfNode extends StatementNode {
  static type = 'if';

  constructor(
    public condition: ValueNode,
    public thenBody: StatementNode,
    public elseBody: StatementNode | null = null
  ) {
    super();
  }

  makeFrame(interpreter: Interpreter) {
    return new IfFrame(interpreter, this);
  }
}

export class IfFrame extends Frame {
  constructor(
    interpreter: Interpreter,
    public node: IfNode
  ) {
    super(interpreter);
  }

  visit() {
    switch (this.state) {
      case 0: {
        this.update(1);
        this.interpreter.pushNode(this.node.condition);
        break;
      }
      case 1: {
        this.update(2);
        if (Boolean(this.interpreter.lastResult)) {
          this.interpreter.pushNode(this.node.thenBody);
        } else if (this.node.elseBody !== null) {
          this.interpreter.pushNode(this.node.elseBody);
        }
        break;
      }
      case 2: {
        this.interpreter.popNode();
        break;
      }
    }
  }
}
