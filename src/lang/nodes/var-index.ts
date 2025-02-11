import { Interpreter } from '../interpreter';

import { Frame, Node } from './base';

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
          interpreter.updateFrame(this, 1);
          interpreter.pushFrame(indexes[this.count]);
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
        interpreter.setResult(interpreter.getVariableIndex(name, this.indexes));
        interpreter.popFrame();
        break;
      }
    }
  }
}
