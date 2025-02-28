import { emptyRecord } from '../handlers/record.js';
import { Interpreter } from '../interpreter.js';

import { Frame, Node, SourceLocation } from './base.js';

export class RecordNode extends Node {
  constructor(
    location: SourceLocation,
    public readonly pairs: {
      readonly key: string;
      readonly value: Node;
    }[]
  ) {
    super(location);
  }

  makeFrame(): Frame {
    return new RecordFrame(this);
  }
}

export class RecordFrame extends Frame {
  declare node: RecordNode;

  readonly count: number = 0;
  readonly items = emptyRecord;

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
