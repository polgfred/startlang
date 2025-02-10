import { Interpreter } from '../interpreter';

import { Frame, StatementNode, ValueNode } from './base';

export class ForNode extends StatementNode {
  constructor(
    public name: string,
    public initial: ValueNode,
    public limit: ValueNode,
    public step: ValueNode | null,
    public body: StatementNode
  ) {
    super();
  }

  makeFrame() {
    return new ForFrame(this);
  }
}

export class ForFrame extends Frame {
  declare node: ForNode;

  index: number = 0;
  limit: number = 0;
  step: number = 1;

  visit(interpreter: Interpreter) {
    switch (this.state) {
      case 0: {
        interpreter.updateFrame(this, 1);
        interpreter.pushFrame(this.node.initial);
        break;
      }
      case 1: {
        interpreter.updateFrame(this, 2, (draft) => {
          draft.index = interpreter.lastResult;
        });
        interpreter.pushFrame(this.node.limit);
        break;
      }
      case 2: {
        if (this.node.step !== null) {
          interpreter.updateFrame(this, 3, (draft) => {
            draft.limit = interpreter.lastResult;
          });
          interpreter.pushFrame(this.node.step);
        } else {
          interpreter.updateFrame(this, 4, (draft) => {
            draft.limit = interpreter.lastResult;
          });
        }
        break;
      }
      case 3: {
        interpreter.updateFrame(this, 4, (draft) => {
          draft.step = interpreter.lastResult;
        });
        break;
      }
      case 4: {
        if (
          this.step > 0 ? this.index <= this.limit : this.index >= this.limit
        ) {
          interpreter.setVariable(this.node.name, this.index);
          interpreter.updateFrame(this, null, (draft) => {
            draft.index += this.step;
          });
          interpreter.pushFrame(this.node.body);
        } else {
          interpreter.popFrame();
        }
      }
    }
  }

  isFlowBoundary(flow: 'loop' | 'call') {
    return flow === 'loop';
  }
}
