import { Interpreter } from '../interpreter.js';

import { Frame, Node } from './base.js';

export class VarNode extends Node {
  constructor(public readonly name: string) {
    super();
  }

  makeFrame() {
    return new VarFrame(this);
  }
}

export class VarFrame extends Frame {
  declare node: VarNode;

  visit(interpreter: Interpreter) {
    interpreter.setResult(interpreter.getVariable(this.node.name));
    interpreter.popFrame();
  }
}
