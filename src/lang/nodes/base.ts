import { immerable } from 'immer';

import { Interpreter } from '../interpreter';
import { Stack } from '../utils/stack';

export abstract class Node {
  abstract makeFrame(): Frame;
}

export abstract class StatementNode extends Node {}

export abstract class ValueNode extends Node {}

export abstract class Frame {
  flowMarker: 'loop' | 'call' | null = null;
  state: number = 0;

  abstract visit(interpreter: Interpreter): void | Promise<void>;
}

Frame[immerable] = true;

class RootFrame extends Frame {
  visit(interpreter: Interpreter) {}
}

export const rootFrame: Stack<Frame> = new Stack(new RootFrame());
