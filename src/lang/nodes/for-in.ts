import { Interpreter } from '../interpreter.js';

import { Frame, Node } from './base.js';

export class ForInNode extends Node {
  constructor(
    public readonly name: string,
    public readonly iterable: Node,
    public readonly body: Node
  ) {
    super();
  }

  makeFrame() {
    return new ForInFrame(this);
  }
}

const emptyList: readonly any[] = Object.freeze([]);

export class ForInFrame extends Frame {
  declare node: ForInNode;

  readonly count: number = 0;
  readonly iterable: readonly any[] = emptyList;

  visit(interpreter: Interpreter) {
    const { name, iterable, body } = this.node;

    switch (this.state) {
      case 0: {
        interpreter.swapFrame(this, 1);
        interpreter.pushFrame(iterable);
        break;
      }
      case 1: {
        interpreter.swapFrame(this, 2, (draft) => {
          const result = interpreter.lastResult;
          const handler = interpreter.getHandler(result);
          draft.iterable = handler.getIterable(result);
        });
        break;
      }
      case 2: {
        if (this.count < this.iterable.length) {
          interpreter.setVariable(name, this.iterable[this.count]);
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
