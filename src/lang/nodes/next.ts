import { Interpreter } from '../interpreter';
import { Frame, StatementNode } from './base';

export class NextNode extends StatementNode {
  makeFrame() {
    return new NextFrame(this);
  }
}

export class NextFrame extends Frame {
  declare node: NextNode;

  visit(interpreter: Interpreter) {
    interpreter.popUntil('loop');
  }
}
