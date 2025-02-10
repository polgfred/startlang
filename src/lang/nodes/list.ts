import { Interpreter } from '../interpreter';

import { Frame, ValueNode } from './base';

export class ListNode extends ValueNode {
  constructor(public readonly items: ValueNode[]) {
    super();
  }

  makeFrame(): Frame {
    return new ListFrame(this);
  }
}

const emptyList: readonly any[] = Object.freeze([]);

export class ListFrame extends Frame {
  declare node: ListNode;

  readonly count: number = 0;
  readonly items = emptyList;

  visit(interpreter: Interpreter) {
    switch (this.state) {
      case 0: {
        if (this.count < this.node.items.length) {
          interpreter.updateFrame(this, 1);
          interpreter.pushFrame(this.node.items[this.count]);
        } else {
          interpreter.updateFrame(this, 2);
        }
        break;
      }
      case 1: {
        interpreter.updateFrame(this, 0, (draft) => {
          draft.items[this.count] = interpreter.lastResult;
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
