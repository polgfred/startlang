import { Interpreter } from '../interpreter.js';

import { Frame, Node } from './base.js';

export class ForNode extends Node {
  constructor(
    public readonly name: string,
    public readonly initial: Node,
    public readonly limit: Node,
    public readonly step: Node | null,
    public readonly body: Node
  ) {
    super();
  }

  makeFrame() {
    return new ForFrame(this);
  }
}

export class ForFrame extends Frame {
  declare node: ForNode;

  readonly index: number = 0;
  readonly limit: number = 0;
  readonly step: number = 1;

  visit(interpreter: Interpreter) {
    const { name, initial, limit, step, body } = this.node;

    switch (this.state) {
      case 0: {
        interpreter.swapFrame(this, 1);
        interpreter.pushFrame(initial);
        break;
      }
      case 1: {
        interpreter.swapFrame(this, 2, (draft) => {
          draft.index = interpreter.lastResult;
        });
        interpreter.pushFrame(limit);
        break;
      }
      case 2: {
        if (step !== null) {
          interpreter.swapFrame(this, 3, (draft) => {
            draft.limit = interpreter.lastResult;
          });
          interpreter.pushFrame(step);
        } else {
          interpreter.swapFrame(this, 4, (draft) => {
            draft.limit = interpreter.lastResult;
          });
        }
        break;
      }
      case 3: {
        interpreter.swapFrame(this, 4, (draft) => {
          draft.step = interpreter.lastResult;
        });
        break;
      }
      case 4: {
        if (
          this.step > 0 ? this.index <= this.limit : this.index >= this.limit
        ) {
          interpreter.setVariable(name, this.index);
          interpreter.swapFrame(this, null, (draft) => {
            draft.index += this.step;
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
