import { Interpreter } from '../interpreter';
import { Frame, StatementNode, ValueNode } from './base';

export class ForNode extends StatementNode {
  static type = 'for';

  name: string;
  from: ValueNode;
  to: ValueNode;
  by: ValueNode | null;
  iterable: ValueNode;
  body: StatementNode;

  constructor(
    name: string,
    from: ValueNode,
    to: ValueNode,
    by: ValueNode | null,
    body: StatementNode
  ) {
    super();
    this.name = name;
    this.from = from;
    this.to = to;
    this.by = by;
    this.body = body;
  }

  makeFrame(interpreter: Interpreter) {
    return new ForFrame(interpreter, this);
  }
}

export class ForFrame extends Frame {
  node: ForNode;
  index: number = 0;
  limit: number = 0;
  step: number = 1;

  constructor(interpreter: Interpreter, node: ForNode) {
    super(interpreter);
    this.node = node;
  }

  visit() {
    switch (this.state) {
      case 0: {
        this.update((draft) => {
          draft.state = 1;
        });
        this.interpreter.pushNode(this.node.from);
        break;
      }
      case 1: {
        this.update((draft) => {
          draft.state = 2;
          draft.index = this.interpreter.lastResult;
        });
        this.interpreter.pushNode(this.node.to);
        break;
      }
      case 2: {
        if (this.node.by !== null) {
          this.update((draft) => {
            draft.state = 3;
            draft.limit = this.interpreter.lastResult;
          });
          this.interpreter.pushNode(this.node.by);
        } else {
          this.update((draft) => {
            draft.state = 4;
            draft.limit = this.interpreter.lastResult;
          });
        }
        break;
      }
      case 3: {
        this.update((draft) => {
          draft.state = 4;
          draft.step = this.interpreter.lastResult;
        });
        break;
      }
      case 4: {
        if (
          this.step > 0 ? this.index <= this.limit : this.index >= this.limit
        ) {
          this.update((draft) => {
            draft.index += this.step;
          });
          this.interpreter.pushNode(this.node.body);
        } else {
          this.interpreter.popNode();
        }
      }
    }
  }
}
