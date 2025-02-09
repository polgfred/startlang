import { Interpreter } from '../interpreter';

import { Frame, StatementNode } from './base';

export class ExitNode extends StatementNode {
  makeFrame() {
    return new ExitFrame(this);
  }
}

export class ExitFrame extends Frame {
  constructor(public node: ExitNode) {
    super();
  }

  visit(interpreter: Interpreter) {
    interpreter.popOut();
  }
}
