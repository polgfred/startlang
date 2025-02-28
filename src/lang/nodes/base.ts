import { immerable } from 'immer';

import { Interpreter } from '../interpreter.js';
import { Cons } from '../utils/cons.js';

export interface SourceLocation {
  offset: number;
  line: number;
  column: number;
}

const nullLocation: SourceLocation = { offset: 0, line: 0, column: 0 };

export abstract class Node {
  constructor(public readonly location: SourceLocation) {}

  abstract makeFrame(): Frame;
}

export abstract class Frame {
  static [immerable] = true;

  readonly state: number = 0;

  constructor(public readonly node: Node) {}

  abstract visit(interpreter: Interpreter): void | Promise<void>;

  dispose(interpreter: Interpreter) {}
  isFlowBoundary(flow: 'loop' | 'call'): boolean {
    return false;
  }
}

class RootNode extends Node {
  makeFrame() {
    return new RootFrame(this);
  }
}

class RootFrame extends Frame {
  visit(interpreter: Interpreter) {
    // this is just here as a sentinel frame
  }
}

export const rootFrame: Cons<Frame> = new Cons(
  new RootNode(nullLocation).makeFrame()
);
