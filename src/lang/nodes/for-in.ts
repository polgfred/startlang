import { Interpreter } from '../interpreter';

import { Frame, StatementNode, ValueNode } from './base';

export class ForInNode extends StatementNode {
  static type = 'for-in';

  constructor(
    public variable: string,
    public iterable: ValueNode,
    public body: StatementNode
  ) {
    super();
  }

  makeFrame(interpreter: Interpreter) {
    return new ForInFrame(interpreter, this);
  }
}

export class ForInFrame extends Frame {
  iterable: any;
  index: number = 0;

  constructor(
    interpreter: Interpreter,
    public node: ForInNode
  ) {
    super(interpreter);
  }

  visit() {
    switch (this.state) {
      case 0: {
        this.update(1);
        this.interpreter.pushNode(this.node.iterable);
        break;
      }
      case 1: {
        this.update(2, (draft) => {
          draft.iterable = this.interpreter.lastResult;
        });
        break;
      }
      case 2: {
        this.update(null, (draft) => {
          draft.index++;
        });
        if (this.index < this.iterable.length) {
          this.interpreter.pushNode(this.node.body);
        } else {
          this.interpreter.popNode();
        }
        break;
      }
    }
  }
}
