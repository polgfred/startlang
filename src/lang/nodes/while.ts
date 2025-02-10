import { Interpreter } from '../interpreter';

import { StatementNode, ValueNode, Frame } from './base';

export class WhileNode extends StatementNode {
  constructor(
    public readonly condition: ValueNode,
    public readonly body: StatementNode
  ) {
    super();
  }

  makeFrame() {
    return new WhileFrame(this);
  }
}

export class WhileFrame extends Frame {
  declare node: WhileNode;

  visit(interpreter: Interpreter) {
    switch (this.state) {
      case 0: {
        interpreter.updateFrame(this, 1);
        interpreter.pushFrame(this.node.condition);
        break;
      }
      case 1: {
        if (interpreter.lastResult) {
          interpreter.updateFrame(this, 0);
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
