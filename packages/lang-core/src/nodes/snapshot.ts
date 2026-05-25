import { Interpreter } from '../interpreter.js';

import { Frame, Node } from './base.js';

export class SnapshotNode extends Node {
  override readonly isStatement = true;

  makeFrame() {
    return new SnapshotFrame(this);
  }
}

class SnapshotFrame extends Frame {
  override onEnter(interpreter: Interpreter) {
    interpreter.takeSnapshot();
  }

  visit(interpreter: Interpreter) {
    interpreter.popFrame();
  }
}
