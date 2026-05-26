import { Interpreter } from '../interpreter.js';

import { Frame, Node } from './base.js';

export class InputNode extends Node {
  override readonly isStatement = true;

  constructor(
    public readonly name: string,
    public readonly prompt: string,
    public readonly initial: string
  ) {
    super();
  }

  makeFrame() {
    return new InputFrame(this);
  }
}

class InputFrame extends Frame {
  declare node: InputNode;

  override onEnter(interpreter: Interpreter) {
    interpreter.pauseForInput({
      prompt: this.node.prompt,
      initial: this.node.initial,
    });
  }

  visit(interpreter: Interpreter) {
    interpreter.setVariable(this.node.name, interpreter.consumeInput());
    interpreter.popFrame();
  }
}
