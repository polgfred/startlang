import { Interpreter } from '../interpreter';
import { Frame, StatementNode, ValueNode } from './base';

export class ForNode extends StatementNode {
  constructor(
    public name: string,
    public initial: ValueNode,
    public limit: ValueNode,
    public step: ValueNode | null,
    public body: StatementNode
  ) {
    super();
  }

  makeFrame(interpreter: Interpreter) {
    return new ForFrame(interpreter, this);
  }
}

export class ForFrame extends Frame {
  index: number = 0;
  limit: number = 0;
  step: number = 1;

  constructor(
    interpreter: Interpreter,
    public node: ForNode
  ) {
    super(interpreter);
  }

  visit() {
    switch (this.state) {
      case 0: {
        this.update(1);
        this.interpreter.pushNode(this.node.initial);
        break;
      }
      case 1: {
        this.update(2, (draft) => {
          draft.index = this.interpreter.lastResult;
        });
        this.interpreter.pushNode(this.node.limit);
        break;
      }
      case 2: {
        if (this.node.step !== null) {
          this.update(3, (draft) => {
            draft.limit = this.interpreter.lastResult;
          });
          this.interpreter.pushNode(this.node.step);
        } else {
          this.update(4, (draft) => {
            draft.limit = this.interpreter.lastResult;
          });
        }
        break;
      }
      case 3: {
        this.update(4, (draft) => {
          draft.step = this.interpreter.lastResult;
        });
        break;
      }
      case 4: {
        if (
          this.step > 0 ? this.index <= this.limit : this.index >= this.limit
        ) {
          this.update(null, (draft) => {
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
