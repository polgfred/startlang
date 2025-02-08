import { Interpreter } from '../interpreter';

import { ValueNode, Frame, StatementNode } from './base';

export class RepeatNode extends StatementNode {
  constructor(
    public times: ValueNode | null,
    public body: StatementNode
  ) {
    super();
  }

  makeFrame() {
    if (this.times === null) {
      return new RepeatFrame(this);
    } else {
      return new RepeatTimesFrame(this);
    }
  }
}

class RepeatFrame extends Frame {
  constructor(public node: RepeatNode) {
    super();
  }

  visit(interpreter: Interpreter) {
    interpreter.pushNode(this.node.body);
  }
}

class RepeatTimesFrame extends Frame {
  times: number = 0;
  count: number = 0;

  constructor(public node: RepeatNode) {
    super();
  }

  visit(interpreter: Interpreter) {
    switch (this.state) {
      case 0: {
        interpreter.updateFrame(this, 1);
        interpreter.pushNode(this.node.times!);
        break;
      }
      case 1: {
        interpreter.updateFrame(this, 2, (draft) => {
          draft.times = Number(interpreter.lastResult);
        });
        break;
      }
      case 2: {
        if (this.count < this.times) {
          interpreter.updateFrame(this, null, (draft) => {
            draft.count++;
          });
          interpreter.pushNode(this.node.body);
        } else {
          interpreter.popNode();
        }
        break;
      }
    }
  }
}
