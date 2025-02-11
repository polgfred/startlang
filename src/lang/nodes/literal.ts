import { Interpreter } from '../interpreter';

import { Node, Frame } from './base';

export class LiteralNode extends Node {
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
    interpreter.setResult(this.node.value);
    interpreter.popFrame();
  }
}
