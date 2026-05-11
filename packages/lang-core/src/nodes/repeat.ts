import { Interpreter } from '../interpreter.js';

import { Frame, Node, UnwindAction, UnwindSignal } from './base.js';

export class RepeatNode extends Node {
  override readonly isStatement = true;

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
    interpreter.pushNode(this.node.body);
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
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        interpreter.pushNode(times!);
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
          interpreter.pushNode(body);
        } else {
          interpreter.popFrame();
        }
        break;
      }
    }
  }

  override onUnwind(signal: UnwindSignal): UnwindAction {
    if (signal === 'break') return 'stop-after';
    if (signal === 'next') return 'stop';
    return 'pass';
  }
}
