import { produce } from 'immer';
import { Interpreter } from '../interpreter';

import { Frame, StatementNode } from './base';

export class BeginNode extends StatementNode {
  constructor(
    public name: string,
    public params: string[],
    public body: StatementNode
  ) {
    super();
  }

  makeFrame() {
    return new BeginFrame(this);
  }
}

export class BeginFrame extends Frame {
  constructor(public node: BeginNode) {
    super();
  }

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
