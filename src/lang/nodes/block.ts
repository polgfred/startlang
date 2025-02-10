import { Interpreter } from '../interpreter';

import { Frame, StatementNode } from './base';

export class BlockNode extends StatementNode {
  constructor(public elems: StatementNode[]) {
    super();
  }

  makeFrame() {
    return new BlockFrame(this);
  }
}

class BlockFrame extends Frame {
  declare node: BlockNode;

  count: number = 0;

  visit(interpreter: Interpreter) {
    if (this.count < this.node.elems.length) {
      interpreter.updateFrame(this, null, (draft) => {
        draft.count++;
      });
      interpreter.pushFrame(this.node.elems[this.count]);
    } else {
      interpreter.popFrame();
    }
  }
}
