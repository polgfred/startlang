import { Interpreter } from '../interpreter.js';

import { Frame, Node, type UnwindSignal } from './base.js';

export class RepeatNode extends Node {
  override readonly isStatement = true;

  constructor(
    public readonly times: Node | null,
    public readonly body: Node
  ) {
    super();
  }

  makeFrame() {
    return new RepeatFrame(this);
  }
}

class RepeatFrame extends Frame {
  declare node: RepeatNode;

  readonly times: number = 0;
  readonly count: number = 0;

  visit(interpreter: Interpreter) {
    const { times, body } = this.node;

    switch (this.state) {
      case 0: {
        if (!times) {
          interpreter.swapFrame(1);
        } else {
          interpreter.swapFrame(2);
          interpreter.pushNode(times);
        }
        break;
      }
      case 1: {
        // Repeat forever
        interpreter.pushNode(this.node.body);
        break;
      }
      case 2: {
        interpreter.swapFrame<this>(3, (draft) => {
          draft.times = Number(interpreter.lastResult);
        });
        break;
      }
      case 3: {
        if (this.count < this.times) {
          interpreter.swapFrame<this>(null, (draft) => {
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

  override onUnwind(signal: UnwindSignal) {
    if (signal === 'break') return 'stop-after';
    if (signal === 'next') return 'stop';
  }
}
