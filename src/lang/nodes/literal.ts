import { Interpreter } from '../interpreter';
import { ValueNode, Frame } from './base';

export class LiteralNode extends ValueNode {
  static type = 'literal';

  value: any;

  constructor(value: any) {
    super();
    this.value = value;
  }

  makeFrame(interpreter: Interpreter) {
    return new LiteralFrame(interpreter, this);
  }
}

export class LiteralFrame extends Frame {
  node: LiteralNode;

  constructor(interpreter: Interpreter, node: LiteralNode) {
    super(interpreter);
    this.node = node;
  }

  visit() {
    this.interpreter.lastResult = this.node.value;
    this.interpreter.popNode();
  }
}
