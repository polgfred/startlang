import { Interpreter } from '../interpreter';

import { ExpressionNode, Frame, StatementNode } from './base';

export class RepeatNode extends StatementNode {
  static type = 'repeat';

  times: ExpressionNode | null;
  body: StatementNode;

  constructor(times: ExpressionNode | null, body: StatementNode) {
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
        this.interpreter.pushNode(this.node.times!);
        this.updateState(1);
        break;
      }
      case 1: {
        this.times = this.interpreter.lastResult;
        this.updateState(2);
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
