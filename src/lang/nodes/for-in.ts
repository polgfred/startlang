import { Interpreter } from '../interpreter';

import { Frame, StatementNode, ValueNode } from './base';

export class ForInNode extends StatementNode {
  constructor(
    public variable: string,
    public iterable: ValueNode,
    public body: StatementNode
  ) {
    super();
  }

  makeFrame() {
    return new ForInFrame(this);
  }
}

export class ForInFrame extends Frame {
  flowMarker = 'loop' as const;
  iterable: any;
  index: number = 0;

  constructor(public node: ForInNode) {
    super();
  }

  visit(interpreter: Interpreter) {
    switch (this.state) {
      case 0: {
        interpreter.updateFrame(this, 1);
        interpreter.pushFrame(this.node.iterable);
        break;
      }
      case 1: {
        interpreter.updateFrame(this, 2, (draft) => {
          draft.iterable = interpreter.lastResult;
        });
        break;
      }
      case 2: {
        if (this.index < this.iterable.length) {
          interpreter.updateFrame(this, null, (draft) => {
            draft.index++;
          });
          interpreter.pushFrame(this.node.body);
        } else {
          interpreter.popFrame();
        }
        break;
      }
    }
  }
}
