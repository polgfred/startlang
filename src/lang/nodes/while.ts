import { Interpreter } from '../interpreter';

import { StatementNode, ValueNode, Frame } from './base';

export class WhileNode extends StatementNode {
  static type = 'while';

  constructor(
    public condition: ValueNode,
    public body: StatementNode
  ) {
    super();
  }

  makeFrame(interpreter: Interpreter) {
    return new WhileFrame(interpreter, this);
  }
}

export class WhileFrame extends Frame {
  constructor(
    interpreter: Interpreter,
    public node: WhileNode
  ) {
    super(interpreter);
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
