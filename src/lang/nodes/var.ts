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
  constructor(public node: VarNode) {
    super();
  }

  visit(interpreter: Interpreter) {
    interpreter.lastResult = interpreter.getVariableValue(this.node.name);
    interpreter.popFrame();
  }
}
