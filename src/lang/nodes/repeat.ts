import { Interpreter } from '../interpreter';

import { ValueNode, Frame, StatementNode } from './base';

export class RepeatNode extends StatementNode {
  static type = 'repeat';

  times: ValueNode | null;
  body: StatementNode;

  constructor(times: ValueNode | null, body: StatementNode) {
    super();
    this.times = times;
    this.body = body;
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
  node: RepeatNode;

  constructor(interpreter: Interpreter, node: RepeatNode) {
    super(interpreter);
    this.node = node;
  }

  visit() {
    this.interpreter.pushNode(this.node.body);
  }
}

class RepeatTimesFrame extends Frame {
  node: RepeatNode;
  times: number = 0;
  count: number = 0;

  constructor(interpreter: Interpreter, node: RepeatNode) {
    super(interpreter);
    this.node = node;
  }

  visit() {
    switch (this.state) {
      case 0: {
        this.update((draft) => {
          draft.state = 1;
        });
        this.interpreter.pushNode(this.node.times!);
        break;
      }
      case 1: {
        this.update((draft) => {
          draft.state = 2;
          draft.times = Number(this.interpreter.lastResult);
        });
        break;
      }
      case 2: {
        if (this.count < this.times) {
          this.update((draft) => {
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
