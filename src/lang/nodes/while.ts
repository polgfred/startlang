import { Interpreter } from '../interpreter';

import { StatementNode, ValueNode, Frame } from './base';

export class WhileNode extends StatementNode {
  static type = 'while';

  condition: ValueNode;
  body: StatementNode;

  constructor(condition: ValueNode, body: StatementNode) {
    super();
    this.condition = condition;
    this.body = body;
  }

  makeFrame(interpreter: Interpreter) {
    return new WhileFrame(interpreter, this);
  }
}

export class WhileFrame extends Frame {
  node: WhileNode;

  constructor(interpreter: Interpreter, node: WhileNode) {
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
        if (Boolean(this.interpreter.lastResult)) {
          this.update((draft) => {
            draft.state = 0;
          });
          this.interpreter.pushNode(this.node.body);
        } else {
          this.interpreter.popNode();
        }
        break;
      }
    }
  }
}
