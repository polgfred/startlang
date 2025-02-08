import { Interpreter } from '../interpreter';

import { Frame, StatementNode, ValueNode } from './base';

export class IfNode extends StatementNode {
  static type = 'if';

  condition: ValueNode;
  thenBody: StatementNode;
  elseBody: StatementNode | null;

  constructor(
    condition: ValueNode,
    thenBody: StatementNode,
    elseBody: StatementNode | null = null
  ) {
    super();
    this.condition = condition;
    this.thenBody = thenBody;
    this.elseBody = elseBody;
  }

  makeFrame(interpreter: Interpreter) {
    return new IfFrame(interpreter, this);
  }
}

export class IfFrame extends Frame {
  node: IfNode;

  constructor(interpreter: Interpreter, node: IfNode) {
    super(interpreter);
    this.node = node;
  }

  visit() {
    switch (this.state) {
      case 0: {
        this.update((draft) => {
          draft.state = 1;
        });
        this.interpreter.pushNode(this.node.condition);
        break;
      }
      case 1: {
        this.update((draft) => {
          draft.state = 2;
        });
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
