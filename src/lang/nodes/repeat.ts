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
    switch (this.state) {
      case 0: {
        interpreter.updateFrame(this, 1);
        interpreter.pushFrame(this.node.times!);
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
          interpreter.pushFrame(this.node.body);
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
