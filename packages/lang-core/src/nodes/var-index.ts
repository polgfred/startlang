import { isIndex } from '../handlers/base.js';
import { Interpreter } from '../interpreter.js';
import type { IndexType } from '../types.js';

import { Frame, Node } from './base.js';

export class VarIndexNode extends Node {
  constructor(
    public readonly name: string,
    public readonly indexes: readonly Node[]
  ) {
    super();
  }

  makeFrame() {
    return new VarIndexFrame(this);
  }
}

const emptyList: readonly IndexType[] = Object.freeze([]);

export class VarIndexFrame extends Frame {
  declare node: VarIndexNode;

  readonly count: number = 0;
  readonly indexes = emptyList;

  visit(interpreter: Interpreter) {
    const { name, indexes } = this.node;

    switch (this.state) {
      case 0: {
        if (this.count < indexes.length) {
          interpreter.swapFrame(1);
          interpreter.pushNode(indexes[this.count]);
        } else {
          interpreter.swapFrame(2);
        }
        break;
      }
      case 1: {
        interpreter.swapFrame<this>(0, (draft) => {
          if (!isIndex(interpreter.lastResult)) {
            throw new Error(`invalid index: ${interpreter.lastResult}`);
          }
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
