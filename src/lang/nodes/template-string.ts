import { Interpreter } from '../interpreter';

import { Frame, ValueNode } from './base';

export class TemplateStringNode extends ValueNode {
  constructor(public readonly segments: ValueNode[]) {
    super();
  }

  makeFrame() {
    return new TemplateStringFrame(this);
  }
}

const emptyList: readonly string[] = Object.freeze([]);

export class TemplateStringFrame extends Frame {
  declare node: TemplateStringNode;

  readonly count: number = 0;
  readonly segments: readonly string[] = emptyList;

  visit(interpreter: Interpreter) {
    switch (this.state) {
      case 0: {
        if (this.count < this.node.segments.length) {
          interpreter.updateFrame(this, 1);
          interpreter.pushFrame(this.node.segments[this.count]);
        } else {
          interpreter.updateFrame(this, 2);
        }
        break;
      }
      case 1: {
        interpreter.updateFrame(this, 0, (draft) => {
          const handler = interpreter.getHandler(interpreter.lastResult);
          draft.segments[this.count] = handler.getPrettyValue(
            interpreter.lastResult
          );
          draft.count++;
        });
        break;
      }
      case 2: {
        interpreter.setResult(this.segments.join(''));
        interpreter.popFrame();
        break;
      }
    }
  }
}
