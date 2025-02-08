import { Interpreter } from '../interpreter';
import { ValueNode, Frame } from './base';

export class LiteralNode extends ValueNode {
  constructor(public value: any) {
    super();
  }

  makeFrame(interpreter: Interpreter) {
    return new LiteralFrame(interpreter, this);
  }
}

export class LiteralFrame extends Frame {
  constructor(
    interpreter: Interpreter,
    public node: LiteralNode
  ) {
    super(interpreter);
  }

  visit() {
    this.interpreter.lastResult = this.node.value;
    this.interpreter.popNode();
  }
}
