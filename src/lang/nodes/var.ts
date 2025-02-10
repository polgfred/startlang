import { Interpreter } from '../interpreter';

import { Frame, ValueNode } from './base';

export class VarNode extends ValueNode {
  constructor(public name: string) {
    super();
  }

  makeFrame() {
    return new VarFrame(this);
  }
}

export class VarFrame extends Frame {
  declare node: VarNode;

  visit(interpreter: Interpreter) {
    interpreter.lastResult = interpreter.getVariable(this.node.name);
    interpreter.popFrame();
  }
}
