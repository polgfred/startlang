import { Interpreter } from '../interpreter.js';

import { Frame, Node } from './base.js';

export class PauseNode extends Node {
  override readonly isStatement = true;

  makeFrame() {
    return new PauseFrame(this);
  }
}

class PauseFrame extends Frame {
  override onEnter(interpreter: Interpreter) {
    interpreter.pauseAtNode({ kind: 'pause' });
  }

  visit(interpreter: Interpreter) {
    interpreter.popFrame();
  }
}
