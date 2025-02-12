import { Interpreter } from '../interpreter.js';

import { Frame, Node } from './base.js';

export class TableNode extends Node {
  constructor(
    public readonly pairs: {
      readonly key: string;
      readonly value: Node;
    }[]
  ) {
    super();
  }

  makeFrame(): Frame {
    return new TableFrame(this);
  }
}

const emptyTable: Record<string, any> = Object.freeze(Object.create(null));

export class TableFrame extends Frame {
  declare node: TableNode;

  readonly count: number = 0;
  readonly items = emptyTable;

  visit(interpreter: Interpreter) {
    const { pairs } = this.node;

    switch (this.state) {
      case 0: {
        if (this.count < pairs.length) {
          interpreter.swapFrame(this, 1);
          interpreter.pushFrame(pairs[this.count].value);
        } else {
          interpreter.swapFrame(this, 2);
        }
        break;
      }
      case 1: {
        interpreter.swapFrame(this, 0, (draft) => {
          draft.items[pairs[this.count].key] = interpreter.lastResult;
          draft.count++;
        });
        break;
      }
      case 2: {
        interpreter.setResult(this.items);
        interpreter.popFrame();
        break;
      }
    }
  }
}
