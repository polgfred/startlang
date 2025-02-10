import { Interpreter } from '../interpreter';

import { ValueNode, Frame } from './base';

export class LiteralNode extends ValueNode {
  constructor(public readonly value: any) {
    super();
  }

  makeFrame() {
    return new LiteralFrame(this);
  }
}

export class LiteralFrame extends Frame {
  declare node: LiteralNode;

  visit(interpreter: Interpreter) {
    interpreter.lastResult = this.node.value;
    interpreter.popFrame();
  }
}
