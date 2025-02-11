import { Interpreter } from '../interpreter';

import { Frame, Node } from './base';

export class ListNode extends Node {
  constructor(public readonly items: Node[]) {
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
    const { items } = this.node;

    switch (this.state) {
      case 0: {
        if (this.count < items.length) {
          interpreter.swapFrame(this, 1);
          interpreter.pushFrame(items[this.count]);
        } else {
          interpreter.swapFrame(this, 2);
        }
        break;
      }
      case 1: {
        interpreter.swapFrame(this, 0, (draft) => {
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
