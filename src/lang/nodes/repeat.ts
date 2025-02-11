import { Interpreter } from '../interpreter';

import { Frame, Node } from './base';

export class RepeatNode extends Node {
  constructor(
    public readonly times: Node | null,
    public readonly body: Node
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
  declare node: RepeatNode;

  visit(interpreter: Interpreter) {
    interpreter.pushFrame(this.node.body);
  }
}

class RepeatTimesFrame extends Frame {
  declare node: RepeatNode;

  readonly times: number = 0;
  readonly count: number = 0;

  visit(interpreter: Interpreter) {
    const { times, body } = this.node;

    switch (this.state) {
      case 0: {
        interpreter.swapFrame(this, 1);
        interpreter.pushFrame(times!);
        break;
      }
      case 1: {
        interpreter.swapFrame(this, 2, (draft) => {
          draft.times = Number(interpreter.lastResult);
        });
        break;
      }
      case 2: {
        if (this.count < this.times) {
          interpreter.swapFrame(this, null, (draft) => {
            draft.count++;
          });
          interpreter.pushFrame(body);
        } else {
          interpreter.popFrame();
        }
        break;
      }
    }
  }

  isFlowBoundary(flow: 'loop' | 'call') {
    return flow === 'loop';
  }
}
