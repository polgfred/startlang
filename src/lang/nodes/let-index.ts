import { Interpreter } from '../interpreter';

import { Frame, Node } from './base';

export class LetIndexNode extends Node {
  constructor(
    public readonly name: string,
    public readonly indexes: Node[],
    public readonly value: Node
  ) {
    super();
  }

  makeFrame() {
    return new LetIndexFrame(this);
  }
}

export class LetIndexFrame extends Frame {
  declare node: LetIndexNode;

  readonly count: number = 0;
  readonly indexes: any[] = [];

  visit(interpreter: Interpreter) {
    switch (this.state) {
      case 0: {
        if (this.count < this.node.indexes.length) {
          interpreter.updateFrame(this, 1);
          interpreter.pushFrame(this.node.indexes[this.count]);
        } else {
          interpreter.updateFrame(this, 2);
        }
        break;
      }
      case 1: {
        interpreter.updateFrame(this, 0, (draft) => {
          draft.indexes[this.count] = interpreter.lastResult;
          draft.count++;
        });
        break;
      }
      case 2: {
        interpreter.updateFrame(this, 3);
        interpreter.pushFrame(this.node.value);
      }
      case 3: {
        interpreter.setVariableIndex(
          this.node.name,
          this.indexes,
          interpreter.lastResult
        );
        interpreter.popFrame();
        break;
      }
    }
  }
}
