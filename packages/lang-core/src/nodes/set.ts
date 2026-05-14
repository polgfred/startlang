import { Interpreter } from '../interpreter.js';

import { Frame, Node } from './base.js';

export class SetNode extends Node {
  override readonly isStatement = true;

  constructor(
    readonly option: string,
    readonly value: Node
  ) {
    super();
  }

  makeFrame() {
    return new SetFrame(this);
  }
}

export class SetFrame extends Frame {
  declare node: SetNode;

  visit(interpreter: Interpreter) {
    const { option, value } = this.node;

    switch (this.state) {
      case 0: {
        interpreter.swapFrame(1);
        interpreter.pushNode(value);
        break;
      }
      case 1: {
        try {
          interpreter.applyConfiguration(option, interpreter.lastResult);
        } catch (err) {
          throw new Error(
            `could not set configuration: ${err instanceof Error ? err.message : err}`
          );
        }
        interpreter.popFrame();
        break;
      }
    }
  }
}
