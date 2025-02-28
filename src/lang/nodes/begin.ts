import { Interpreter } from '../interpreter.js';

import { Frame, Node, SourceLocation } from './base.js';

export class BeginNode extends Node {
  constructor(
    location: SourceLocation,
    public readonly name: string,
    public readonly params: string[],
    public readonly body: Node
  ) {
    super(location);
  }

  makeFrame() {
    return new BeginFrame(this);
  }
}

export class BeginFrame extends Frame {
  declare node: BeginNode;

  visit(interpreter: Interpreter) {
    interpreter.defineGlobalFunction(this.node);
    interpreter.popFrame();
  }
}
