import { Interpreter } from '../interpreter.js';

import { Frame, Node, SourceLocation } from './base.js';

export class SetNode extends Node {
  constructor(
    location: SourceLocation,
    readonly option: string,
    readonly value: Node
  ) {
    super(location);
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
        interpreter.swapFrame(this, 1);
        interpreter.pushFrame(value);
        break;
      }
      case 1: {
        try {
          // @ts-expect-error the host needs to handle this
          interpreter.host.setConfiguration(option, interpreter.lastResult);
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
