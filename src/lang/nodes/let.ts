import { Interpreter } from '../interpreter';

import { Frame, StatementNode, ValueNode } from './base';

export class LetNode extends StatementNode {
  constructor(
    public name: string,
    public value: ValueNode
  ) {
    super();
  }

  makeFrame() {
    return new LetFrame(this);
  }
}

export class LetFrame extends Frame {
  constructor(public node: LetNode) {
    super();
  }

  visit(interpreter: Interpreter) {
    switch (this.state) {
      case 0: {
        interpreter.updateFrame(this, 1);
        interpreter.pushFrame(this.node.value);
        break;
      }
      case 1: {
        interpreter.setVariableValue(this.node.name, interpreter.lastResult);
        interpreter.popFrame();
        break;
      }
    }
  }
}
