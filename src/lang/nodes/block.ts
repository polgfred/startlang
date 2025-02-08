import { Interpreter } from '../interpreter';

import { Frame, StatementNode } from './base';

export class BlockNode extends StatementNode {
  static type = 'block';

  constructor(public elems: StatementNode[]) {
    super();
  }

  makeFrame(interpreter: Interpreter) {
    return new BlockFrame(interpreter, this);
  }
}

class BlockFrame extends Frame {
  count: number = 0;

  constructor(
    interpreter: Interpreter,
    private node: BlockNode
  ) {
    super(interpreter);
  }

  visit() {
    if (this.count < this.node.elems.length) {
      this.update(null, (draft) => {
        draft.count = this.count + 1;
      });
      this.interpreter.pushNode(this.node.elems[this.count]);
    } else {
      this.interpreter.popNode();
    }
  }
}
