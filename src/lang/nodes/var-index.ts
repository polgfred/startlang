import { Interpreter } from '../interpreter.js';

import { Frame, Node } from './base.js';

export class VarIndexNode extends Node {
  constructor(
    public readonly name: string,
    public readonly indexes: Node[]
  ) {
    super();
  }

  makeFrame() {
    return new VarIndexFrame(this);
  }
}

const emptyList: readonly any[] = Object.freeze([]);

export class VarIndexFrame extends Frame {
  declare node: VarIndexNode;

  readonly count: number = 0;
  readonly indexes: readonly any[] = emptyList;

  visit(interpreter: Interpreter) {
    const { name, indexes } = this.node;

    switch (this.state) {
      case 0: {
        if (this.count < indexes.length) {
          interpreter.swapFrame(this, 1);
          interpreter.pushFrame(indexes[this.count]);
        } else {
          interpreter.swapFrame(this, 2);
        }
        break;
      }
      case 1: {
        interpreter.swapFrame(this, 0, (draft) => {
          draft.indexes[this.count] = interpreter.lastResult;
          draft.count++;
        });
        break;
      }
      case 2: {
        interpreter.setResult(interpreter.getVariableIndex(name, this.indexes));
        interpreter.popFrame();
        break;
      }
    }
  }
}
