import { Interpreter } from '../interpreter.js';

import { Frame, Node, SourceLocation } from './base.js';

export class WhileNode extends Node {
  constructor(
    location: SourceLocation,
    public readonly condition: Node,
    public readonly body: Node
  ) {
    super(location);
  }

  makeFrame() {
    return new WhileFrame(this);
  }
}

export class WhileFrame extends Frame {
  declare node: WhileNode;

  visit(interpreter: Interpreter) {
    const { condition, body } = this.node;

    switch (this.state) {
      case 0: {
        interpreter.swapFrame(this, 1);
        interpreter.pushFrame(condition);
        break;
      }
      case 1: {
        if (interpreter.lastResult) {
          interpreter.swapFrame(this, 0);
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
