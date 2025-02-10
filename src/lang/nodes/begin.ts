import { produce } from 'immer';

import { Interpreter } from '../interpreter';

import { Frame, Node } from './base';

export class BeginNode extends Node {
  constructor(
    public readonly name: string,
    public readonly params: string[],
    public readonly body: Node
  ) {
    super();
  }

  makeFrame() {
    return new BeginFrame(this);
  }
}

export class BeginFrame extends Frame {
  declare node: BeginNode;

  visit(interpreter: Interpreter) {
    interpreter.globalFunctions = produce(
      interpreter.globalFunctions,
      (draft) => {
        draft[this.node.name] = this.node;
      }
    );
    interpreter.popFrame();
  }
}
