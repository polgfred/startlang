import { Interpreter } from '../interpreter';

import { ValueNode, Frame, StatementNode } from './base';

export class RepeatNode extends StatementNode {
  static type = 'repeat';

  constructor(
    public times: ValueNode | null,
    public body: StatementNode
  ) {
    super();
  }

  makeFrame(interpreter: Interpreter) {
    if (this.times === null) {
      return new RepeatFrame(interpreter, this);
    } else {
      return new RepeatTimesFrame(interpreter, this);
    }
  }
}

class RepeatFrame extends Frame {
  constructor(
    interpreter: Interpreter,
    public node: RepeatNode
  ) {
    super(interpreter);
  }

  visit() {
    this.interpreter.pushNode(this.node.body);
  }
}

class RepeatTimesFrame extends Frame {
  times: number = 0;
  count: number = 0;

  constructor(
    interpreter: Interpreter,
    public node: RepeatNode
  ) {
    super(interpreter);
  }

  visit() {
    switch (this.state) {
      case 0: {
        this.update(1);
        this.interpreter.pushNode(this.node.times!);
        break;
      }
      case 1: {
        this.update(2, (draft) => {
          draft.times = Number(this.interpreter.lastResult);
        });
        break;
      }
      case 2: {
        if (this.count < this.times) {
          this.update(null, (draft) => {
            draft.count = this.count + 1;
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
