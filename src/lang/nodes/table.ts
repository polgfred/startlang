import { Interpreter } from '../interpreter';

import { Frame, Node } from './base';

export class TableNode extends Node {
  constructor(
    public readonly keys: string[],
    public readonly values: Node[]
  ) {
    super();
  }

  makeFrame(): Frame {
    return new TableFrame(this);
  }
}

const emptyTable: object = Object.freeze(Object.create(null));

export class TableFrame extends Frame {
  declare node: TableNode;

  readonly count: number = 0;
  readonly items: object = emptyTable;

  visit(interpreter: Interpreter) {
    switch (this.state) {
      case 0: {
        if (this.count < this.node.keys.length) {
          interpreter.updateFrame(this, 1);
          interpreter.pushFrame(this.node.values[this.count]);
        } else {
          interpreter.updateFrame(this, 2);
        }
        break;
      }
      case 1: {
        interpreter.updateFrame(this, 0, (draft) => {
          draft.items[this.node.keys[this.count]] = interpreter.lastResult;
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
