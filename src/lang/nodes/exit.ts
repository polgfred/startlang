import { Interpreter } from '../interpreter';

import { Frame, StatementNode } from './base';

export class ExitNode extends StatementNode {
  makeFrame() {
    return new ExitFrame(this);
  }
}

export class ExitFrame extends Frame {
  declare node: ExitNode;

  visit(interpreter: Interpreter) {
    interpreter.popOut();
  }
}
