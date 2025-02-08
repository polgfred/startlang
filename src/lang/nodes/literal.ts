import { Interpreter } from '../interpreter';
import { ValueNode, Frame } from './base';

export class LiteralNode extends ValueNode {
  constructor(public value: any) {
    super();
  }

  makeFrame() {
    return new LiteralFrame(this);
  }
}

export class LiteralFrame extends Frame {
  constructor(public node: LiteralNode) {
    super();
  }

  visit(interpreter: Interpreter) {
    interpreter.lastResult = this.node.value;
    interpreter.popNode();
  }
}
