import { Interpreter } from '../interpreter';

import { Frame, ValueNode } from './base';

export class LogicalOpNode extends ValueNode {
  constructor(
    public operator: 'and' | 'or',
    public values: ValueNode[]
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

export class LogicalNotNode extends ValueNode {
  constructor(public value: ValueNode) {
    super();
  }

  makeFrame() {
    return new LogicalNotFrame(this);
  }
}

export class LogicalAndFrame extends Frame {
  declare node: LogicalOpNode;

  count: number = 0;

  visit(interpreter: Interpreter) {
    switch (this.state) {
      case 0: {
        if (this.count < this.node.values.length) {
          interpreter.updateFrame(this, 1);
          interpreter.pushFrame(this.node.values[this.count]);
        } else {
          interpreter.updateFrame(this, 2);
        }
        break;
      }
      case 1: {
        if (!interpreter.lastResult) {
          interpreter.lastResult = false;
          interpreter.popFrame();
        } else {
          interpreter.updateFrame(this, 0, (draft) => {
            draft.count++;
          });
        }
        break;
      }
      case 2: {
        interpreter.lastResult = true;
        interpreter.popFrame();
        break;
      }
    }
  }
}

export class LogicalOrFrame extends Frame {
  declare node: LogicalOpNode;

  count: number = 0;

  visit(interpreter: Interpreter) {
    switch (this.state) {
      case 0: {
        if (this.count < this.node.values.length) {
          interpreter.updateFrame(this, 1);
          interpreter.pushFrame(this.node.values[this.count]);
        } else {
          interpreter.updateFrame(this, 2);
        }
        break;
      }
      case 1: {
        if (interpreter.lastResult) {
          interpreter.lastResult = true;
          interpreter.popFrame();
        } else {
          interpreter.updateFrame(this, 0, (draft) => {
            draft.count++;
          });
        }
        break;
      }
      case 2: {
        interpreter.lastResult = false;
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
        interpreter.updateFrame(this, 1);
        interpreter.pushFrame(this.node.value);
        break;
      }
      case 1: {
        interpreter.lastResult = !interpreter.lastResult;
        interpreter.popFrame();
        break;
      }
    }
  }
}
