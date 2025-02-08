import { Interpreter } from '../interpreter';

import { Frame, StatementNode } from './base';

export class BlockNode extends StatementNode {
  static type = 'block';

  elems: StatementNode[];

  constructor(elems: StatementNode[]) {
    super();
    this.elems = elems;
  }

  makeFrame(interpreter: Interpreter) {
    return new BlockFrame(interpreter, this);
  }
}

class BlockFrame extends Frame {
  node: BlockNode;

  count: number = 0;

  constructor(interpreter: Interpreter, node: BlockNode) {
    super(interpreter);
    this.node = node;
  }

  visit() {
    if (this.count < this.node.elems.length) {
      this.update((draft) => {
        draft.count = this.count + 1;
      });
      this.interpreter.pushNode(this.node.elems[this.count]);
    } else {
      this.interpreter.popNode();
    }
  }
}
