import { immerable } from 'immer';

import { Interpreter } from '../interpreter';
import { Stack } from '../utils/stack';

export abstract class Node {
  abstract makeFrame(): Frame;
}

export abstract class Frame {
  readonly state: number = 0;

  constructor(public readonly node: Node) {}

  abstract visit(interpreter: Interpreter): void | Promise<void>;

  dispose(interpreter: Interpreter) {}
  isFlowBoundary(flow: 'loop' | 'call'): boolean {
    return false;
  }
}

Frame[immerable] = true;

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

export const rootFrame: Stack<Frame> = new Stack(new RootNode().makeFrame());

export const rootNamespace: Stack<object> = new Stack(Object.create(null));
