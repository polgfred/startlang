import { Interpreter } from '../interpreter.js';

import { Frame, Node } from './base.js';

export class IfNode extends Node {
  constructor(
    public readonly condition: Node,
    public readonly thenBody: Node,
    public readonly elseBody: Node | null = null
  ) {
    super();
  }

  makeFrame() {
    return new IfFrame(this);
  }
}

export class IfFrame extends Frame {
  declare node: IfNode;

  visit(interpreter: Interpreter) {
    const { condition, thenBody, elseBody } = this.node;

    switch (this.state) {
      case 0: {
        interpreter.swapFrame(this, 1);
        interpreter.pushNode(condition);
        break;
      }
      case 1: {
        interpreter.swapFrame(this, 2);
        if (interpreter.lastResult) {
          interpreter.pushNode(thenBody);
        } else if (elseBody !== null) {
          interpreter.pushNode(elseBody);
        }
        break;
      }
      case 2: {
        interpreter.popFrame();
        break;
      }
    }
  }
}
