import { Interpreter } from '../interpreter';

import { Frame, Node } from './base';

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
    switch (this.state) {
      case 0: {
        interpreter.updateFrame(this, 1);
        interpreter.pushFrame(this.node.condition);
        break;
      }
      case 1: {
        interpreter.updateFrame(this, 2);
        if (Boolean(interpreter.lastResult)) {
          interpreter.pushFrame(this.node.thenBody);
        } else if (this.node.elseBody !== null) {
          interpreter.pushFrame(this.node.elseBody);
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
