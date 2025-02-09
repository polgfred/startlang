import { Interpreter } from '../interpreter';

import { Frame, ValueNode } from './base';

export class VarIndexNode extends ValueNode {
  constructor(
    public name: string,
    public indexes: ValueNode[]
  ) {
    super();
  }

  makeFrame() {
    return new VarIndexFrame(this);
  }
}

export class VarIndexFrame extends Frame {
  count: number = 0;
  indexes: any[] = [];

  constructor(public node: VarIndexNode) {
    super();
  }

  visit(interpreter: Interpreter) {
    switch (this.state) {
      case 0: {
        if (this.count < this.node.indexes.length) {
          interpreter.updateFrame(this, 1);
          interpreter.pushFrame(this.node.indexes[this.count]);
        } else {
          interpreter.updateFrame(this, 2);
        }
        break;
      }
      case 1: {
        interpreter.updateFrame(this, 0, (draft) => {
          draft.indexes[this.count] = interpreter.lastResult;
          draft.count++;
        });
        break;
      }
      case 2: {
        interpreter.lastResult = interpreter.getVariableIndex(
          this.node.name,
          this.indexes
        );
        interpreter.popFrame();
        break;
      }
    }
  }
}
