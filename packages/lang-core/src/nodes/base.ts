import { immerable } from 'immer';

import { Interpreter } from '../interpreter.js';

interface SourceOffset {
  offset: number;
  line: number;
  column: number;
}

export interface SourceLocation {
  start: SourceOffset;
  end: SourceOffset;
}

const nullLocation: SourceLocation = {
  start: { offset: 0, line: 0, column: 0 },
  end: { offset: 0, line: 0, column: 0 },
};

export abstract class Node {
  location: SourceLocation = nullLocation;
  readonly isStatement: boolean = false;

  at(location: SourceLocation): this {
    this.location = location;
    return this;
  }

  abstract makeFrame(): Frame;
}

export type UnwindSignal = 'break' | 'next' | 'return';
export type UnwindAction = 'stop' | 'stop-after';

export abstract class Frame {
  static [immerable] = true;

  readonly state: number = 0;

  constructor(public readonly node: Node) {}

  abstract visit(interpreter: Interpreter): void;

  onEnter(interpreter: Interpreter) {}

  onExit(interpreter: Interpreter) {}

  onUnwind(signal: UnwindSignal): UnwindAction | undefined {
    return;
  }
}
