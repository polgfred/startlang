import { Interpreter } from '../interpreter';

import { Frame, StatementNode, ValueNode } from './base';

export class LetNode extends StatementNode {
  constructor(
    public readonly name: string,
    public readonly value: ValueNode,
    public readonly isLocal: boolean = false
  ) {
    super();
  }

  makeFrame() {
    return new LetFrame(this);
  }
}

export class LetFrame extends Frame {
  declare node: LetNode;

  visit(interpreter: Interpreter) {
    switch (this.state) {
      case 0: {
        interpreter.updateFrame(this, 1);
        interpreter.pushFrame(this.node.value);
        break;
      }
      case 1: {
        interpreter.setVariable(
          this.node.name,
          interpreter.lastResult,
          this.node.isLocal
        );
        interpreter.popFrame();
        break;
      }
    }
  }
}
