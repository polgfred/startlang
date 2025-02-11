import { Interpreter } from '../interpreter';

import { Frame, Node } from './base';

export class TemplateStringNode extends Node {
  constructor(public readonly segments: Node[]) {
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
    const { segments } = this.node;

    switch (this.state) {
      case 0: {
        if (this.count < segments.length) {
          interpreter.updateFrame(this, 1);
          interpreter.pushFrame(segments[this.count]);
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
