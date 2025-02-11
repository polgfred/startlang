import { Interpreter } from '../interpreter';

import { Frame, Node } from './base';

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
        interpreter.updateFrame(this, 1);
        interpreter.pushFrame(iterable);
        break;
      }
      case 1: {
        interpreter.updateFrame(this, 2, (draft) => {
          const handler = interpreter.getHandler(interpreter.lastResult);
          draft.iterable = handler.getIterable(interpreter.lastResult);
        });
        break;
      }
      case 2: {
        if (this.count < this.iterable.length) {
          interpreter.setVariable(name, this.iterable[this.count]);
          interpreter.updateFrame(this, null, (draft) => {
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
