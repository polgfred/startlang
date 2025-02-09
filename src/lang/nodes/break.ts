import { Interpreter } from '../interpreter';
import { Frame, StatementNode } from './base';

export class BreakNode extends StatementNode {
  makeFrame() {
    return new BreakFrame(this);
  }
}

export class BreakFrame extends Frame {
  constructor(public node: BreakNode) {
    super();
  }

  visit(interpreter: Interpreter) {
    interpreter.popOver('loop');
  }
}
