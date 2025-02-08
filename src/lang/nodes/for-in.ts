import { Interpreter } from '../interpreter';

import { Frame, StatementNode, ValueNode } from './base';

export class ForInNode extends StatementNode {
  static type = 'for-in';

  name: string;
  iterable: ValueNode;
  body: StatementNode;

  constructor(variable: string, iterable: ValueNode, body: StatementNode) {
    super();
    this.name = variable;
    this.iterable = iterable;
    this.body = body;
  }

  makeFrame(interpreter: Interpreter) {
    return new ForInFrame(interpreter, this);
  }
}

export class ForInFrame extends Frame {
  node: ForInNode;
  iterable: any;
  index: number = 0;

  constructor(interpreter: Interpreter, node: ForInNode) {
    super(interpreter);
    this.node = node;
  }

  visit() {
    switch (this.state) {
      case 0: {
        this.update((draft) => {
          draft.state = 1;
        });
        this.interpreter.pushNode(this.node.iterable);
        break;
      }
      case 1: {
        this.update((draft) => {
          draft.state = 2;
          draft.iterable = this.interpreter.lastResult;
        });
        break;
      }
      case 2: {
        this.update((draft) => {
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
