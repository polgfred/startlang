import { Interpreter } from '../interpreter.js';

import { Frame, Node, type UnwindSignal } from './base.js';

export class WhileNode extends Node {
  override readonly isStatement = true;

  constructor(
    public readonly condition: Node,
    public readonly body: Node
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
    const { condition, body } = this.node;

    switch (this.state) {
      case 0: {
        interpreter.swapFrame(this, 1);
        interpreter.pushNode(condition);
        break;
      }
      case 1: {
        if (interpreter.lastResult) {
          interpreter.swapFrame(this, 0);
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
