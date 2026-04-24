import { Interpreter } from '../interpreter.js';

import { Frame, Node, SourceLocation } from './base.js';

export class TemplateStringNode extends Node {
  constructor(
    location: SourceLocation,
    public readonly segments: readonly Node[]
  ) {
    super(location);
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
          interpreter.swapFrame(this, 1);
          interpreter.pushFrame(segments[this.count]);
        } else {
          interpreter.swapFrame(this, 2);
        }
        break;
      }
      case 1: {
        interpreter.swapFrame(this, 0, (draft) => {
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
