import { Interpreter } from '../interpreter.js';

import { Frame, Node, SourceLocation } from './base.js';

export class IfNode extends Node {
  constructor(
    location: SourceLocation,
    public readonly condition: Node,
    public readonly thenBody: Node,
    public readonly elseBody: Node | null = null
  ) {
    super(location);
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
        interpreter.pushFrame(condition);
        break;
      }
      case 1: {
        interpreter.swapFrame(this, 2);
        if (interpreter.lastResult) {
          interpreter.pushFrame(thenBody);
        } else if (elseBody !== null) {
          interpreter.pushFrame(elseBody);
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
