import { Interpreter } from '../interpreter.js';

import { Frame, Node } from './base.js';

export class LetNode extends Node {
  constructor(
    public readonly name: string,
    public readonly value: Node,
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
    const { name, value, isLocal } = this.node;

    switch (this.state) {
      case 0: {
        interpreter.swapFrame(this, 1);
        interpreter.pushFrame(value);
        break;
      }
      case 1: {
        interpreter.setVariable(name, interpreter.lastResult, isLocal);
        interpreter.popFrame();
        break;
      }
    }
  }
}
