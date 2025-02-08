import { immerable, produce } from 'immer';

import { Interpreter } from '../interpreter';

export class Node {
  static type: string;

  makeFrame(interpreter: Interpreter): Frame {
    throw new Error('not implemented');
  }
}

export class StatementNode extends Node {}

export class ExpressionNode extends Node {}

export class Frame {
  interpreter: Interpreter;
  state: number = 0;

  constructor(interpreter: Interpreter) {
    this.interpreter = interpreter;
  }

  visit(): void | Promise<void> {
    throw new Error('not implemented');
  }

  ///

  protected update(update: (draft: this) => void): void {
    this.interpreter.topFrame = produce(this, update);
  }
}

Frame[immerable] = true;
