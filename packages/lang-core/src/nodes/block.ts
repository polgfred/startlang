import { Interpreter } from '../interpreter.js';

import { Frame, Node } from './base.js';

export class BlockNode extends Node {
  constructor(public elems: Node[]) {
    super();
  }

  makeFrame() {
    return new BlockFrame(this);
  }
}

class BlockFrame extends Frame {
  declare node: BlockNode;

  readonly count: number = 0;

  visit(interpreter: Interpreter) {
    const { elems } = this.node;

    if (this.count < elems.length) {
      interpreter.swapFrame(this, null, (draft) => {
        draft.count++;
      });
      interpreter.pushFrame(elems[this.count]);
    } else {
      interpreter.popFrame();
    }
  }
}
