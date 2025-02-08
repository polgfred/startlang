import { Draft, immerable, produce } from 'immer';

import { Interpreter } from '../interpreter';

export class Node {
  static type: string;

  makeFrame(interpreter: Interpreter): Frame {
    throw new Error('not implemented');
  }
}

export class StatementNode extends Node {}

export class ValueNode extends Node {}

export class Frame {
  state: number = 0;

  constructor(protected interpreter: Interpreter) {}

  visit(): void | Promise<void> {
    throw new Error('not implemented');
  }

  ///

  protected update(
    state: number | null,
    updater?: (draft: Draft<this>) => void
  ): void {
    this.interpreter.topFrame = produce(this, (draft) => {
      if (state !== null) {
        draft.state = state;
      }
      updater?.(draft);
    });
  }
}

Frame[immerable] = true;
