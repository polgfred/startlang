import { Interpreter } from '../interpreter.js';

import { Node, Frame } from './base.js';

export class LiteralNode extends Node {
  constructor(public readonly value: unknown) {
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
