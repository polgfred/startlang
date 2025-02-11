import { Interpreter } from '../interpreter.js';

import { Frame, Node } from './base.js';

export class LogicalOpNode extends Node {
  constructor(
    public readonly operator: 'and' | 'or',
    public readonly values: Node[]
  ) {
    super();
  }

  makeFrame() {
    switch (this.operator) {
      case 'and':
        return new LogicalAndFrame(this);
      case 'or':
        return new LogicalOrFrame(this);
    }
  }
}

export class LogicalNotNode extends Node {
  constructor(public readonly value: Node) {
    super();
  }

  makeFrame() {
    return new LogicalNotFrame(this);
  }
}

export class LogicalAndFrame extends Frame {
  declare node: LogicalOpNode;

  readonly count: number = 0;

  visit(interpreter: Interpreter) {
    const { values } = this.node;

    switch (this.state) {
      case 0: {
        if (this.count < values.length) {
          interpreter.swapFrame(this, 1);
          interpreter.pushFrame(values[this.count]);
        } else {
          interpreter.swapFrame(this, 2);
        }
        break;
      }
      case 1: {
        if (!interpreter.lastResult) {
          interpreter.setResult(false);
          interpreter.popFrame();
        } else {
          interpreter.swapFrame(this, 0, (draft) => {
            draft.count++;
          });
        }
        break;
      }
      case 2: {
        interpreter.setResult(true);
        interpreter.popFrame();
        break;
      }
    }
  }
}

export class LogicalOrFrame extends Frame {
  declare node: LogicalOpNode;

  readonly count: number = 0;

  visit(interpreter: Interpreter) {
    const { values } = this.node;

    switch (this.state) {
      case 0: {
        if (this.count < values.length) {
          interpreter.swapFrame(this, 1);
          interpreter.pushFrame(values[this.count]);
        } else {
          interpreter.swapFrame(this, 2);
        }
        break;
      }
      case 1: {
        if (interpreter.lastResult) {
          interpreter.setResult(true);
          interpreter.popFrame();
        } else {
          interpreter.swapFrame(this, 0, (draft) => {
            draft.count++;
          });
        }
        break;
      }
      case 2: {
        interpreter.setResult(false);
        interpreter.popFrame();
        break;
      }
    }
  }
}

export class LogicalNotFrame extends Frame {
  declare node: LogicalNotNode;

  visit(interpreter: Interpreter) {
    switch (this.state) {
      case 0: {
        interpreter.swapFrame(this, 1);
        interpreter.pushFrame(this.node.value);
        break;
      }
      case 1: {
        interpreter.setResult(!interpreter.lastResult);
        interpreter.popFrame();
        break;
      }
    }
  }
}
