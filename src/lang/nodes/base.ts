import { immerable } from 'immer';

import { Interpreter } from '../interpreter';

export class Node {
  makeFrame(): Frame {
    throw new Error('not implemented');
  }
}

export class StatementNode extends Node {}

export class ValueNode extends Node {}

export class Frame {
  state: number = 0;

  visit(interpreter: Interpreter): void | Promise<void> {
    throw new Error('not implemented');
  }
}

Frame[immerable] = true;

export class FrameStack {
  static root = new FrameStack(new Frame());

  constructor(
    public top: Frame,
    public parent: FrameStack = FrameStack.root
  ) {
    Object.freeze(this);
  }

  swap(frame: Frame) {
    return new FrameStack(frame, this.parent);
  }

  push(frame: Frame) {
    return new FrameStack(frame, this);
  }

  pop() {
    return this.parent;
  }

  isRoot() {
    return this === FrameStack.root;
  }
}
