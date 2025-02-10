import { Interpreter } from '../interpreter';

import { Frame, StatementNode, ValueNode } from './base';

export class ForInNode extends StatementNode {
  constructor(
    public readonly name: string,
    public readonly iterable: ValueNode,
    public readonly body: StatementNode
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
    switch (this.state) {
      case 0: {
        interpreter.updateFrame(this, 1);
        interpreter.pushFrame(this.node.iterable);
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
          interpreter.setVariable(this.node.name, this.iterable[this.count]);
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
