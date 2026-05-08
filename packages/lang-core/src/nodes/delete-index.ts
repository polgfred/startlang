import { Interpreter } from '../interpreter.js';
import type { IndexType } from '../types.js';

import { Frame, Node } from './base.js';

export class DeleteIndexNode extends Node {
  constructor(
    public readonly name: string,
    public readonly indexes: readonly Node[]
  ) {
    super();
  }

  makeFrame() {
    return new DeleteIndexFrame(this);
  }
}

const emptyList: readonly IndexType[] = Object.freeze([]);

export class DeleteIndexFrame extends Frame {
  declare node: DeleteIndexNode;

  readonly count: number = 0;
  readonly indexes = emptyList;

  visit(interpreter: Interpreter) {
    const { name, indexes } = this.node;

    switch (this.state) {
      case 0: {
        if (this.count < indexes.length) {
          interpreter.swapFrame(this, 1);
          interpreter.pushNode(indexes[this.count]);
        } else {
          interpreter.swapFrame(this, 2);
        }
        break;
      }
      case 1: {
        interpreter.swapFrame(this, 0, (draft) => {
          if (
            typeof interpreter.lastResult !== 'number' &&
            typeof interpreter.lastResult !== 'string'
          ) {
            throw new Error(`invalid index: ${interpreter.lastResult}`);
          }
          draft.indexes[this.count] = interpreter.lastResult;
          draft.count++;
        });
        break;
      }
      case 2: {
        interpreter.deleteVariableIndex(name, this.indexes);
        interpreter.popFrame();
        break;
      }
    }
  }
}
