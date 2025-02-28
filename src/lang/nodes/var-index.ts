import { Interpreter } from '../interpreter.js';
import type { IndexType } from '../types.js';

import { Frame, Node, SourceLocation } from './base.js';

export class VarIndexNode extends Node {
  constructor(
    location: SourceLocation,
    public readonly name: string,
    public readonly indexes: Node[]
  ) {
    super(location);
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
          interpreter.swapFrame(this, 1);
          interpreter.pushFrame(indexes[this.count]);
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
        interpreter.setResult(interpreter.getVariableIndex(name, this.indexes));
        interpreter.popFrame();
        break;
      }
    }
  }
}
