import { Interpreter } from '../interpreter.js';

import { Frame, Node } from './base.js';

export class DeleteNode extends Node {
  constructor(public readonly name: string) {
    super();
  }

  makeFrame() {
    return new DeleteFrame(this);
  }
}

export class DeleteFrame extends Frame {
  declare node: DeleteNode;

  visit(interpreter: Interpreter) {
    interpreter.deleteVariable(this.node.name);
    interpreter.popFrame();
  }
}
