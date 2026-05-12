import { Interpreter } from '../interpreter.js';

import { Frame, Node } from './base.js';

export class LogicalOpNode extends Node {
  constructor(
    public readonly operator: 'and' | 'or',
    public readonly left: Node,
    public readonly right: Node
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

  visit(interpreter: Interpreter) {
    const { left, right } = this.node;

    switch (this.state) {
      case 0: {
        interpreter.swapFrame(1);
        interpreter.pushNode(left);
        break;
      }
      case 1: {
        if (!interpreter.lastResult) {
          interpreter.setResult(false);
          interpreter.popFrame();
        } else {
          interpreter.swapFrame(2);
          interpreter.pushNode(right);
        }
        break;
      }
      case 2: {
        interpreter.setResult(Boolean(interpreter.lastResult));
        interpreter.popFrame();
        break;
      }
    }
  }
}

export class LogicalOrFrame extends Frame {
  declare node: LogicalOpNode;

  visit(interpreter: Interpreter) {
    const { left, right } = this.node;

    switch (this.state) {
      case 0: {
        interpreter.swapFrame(1);
        interpreter.pushNode(left);
        break;
      }
      case 1: {
        if (interpreter.lastResult) {
          interpreter.setResult(true);
          interpreter.popFrame();
        } else {
          interpreter.swapFrame(2);
          interpreter.pushNode(right);
        }
        break;
      }
      case 2: {
        interpreter.setResult(Boolean(interpreter.lastResult));
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
        interpreter.swapFrame(1);
        interpreter.pushNode(this.node.value);
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
