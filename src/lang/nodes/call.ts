import { Interpreter } from '../interpreter';

import { Frame, Node } from './base';

export class CallNode extends Node {
  constructor(
    public readonly name: string,
    public readonly args: Node[]
  ) {
    super();
  }

  makeFrame() {
    return new CallFrame(this);
  }
}

export class CallFrame extends Frame {
  declare node: CallNode;

  readonly count: number = 0;
  readonly args: any[] = [];
  readonly hasNamespace: boolean = false;

  visit(interpreter: Interpreter) {
    switch (this.state) {
      case 0: {
        if (this.count < this.node.args.length) {
          interpreter.updateFrame(this, 1);
          interpreter.pushFrame(this.node.args[this.count]);
        } else if (this.node.name in interpreter.globalFunctions) {
          interpreter.updateFrame(this, 2);
        } else {
          interpreter.updateFrame(this, 4);
        }
        break;
      }
      case 1: {
        interpreter.updateFrame(this, 0, (draft) => {
          draft.args[this.count] = interpreter.lastResult;
          draft.count++;
        });
        break;
      }
      case 2: {
        const func = interpreter.globalFunctions[this.node.name];
        interpreter.pushNamespace();
        for (let i = 0; i < func.params.length; i++) {
          interpreter.setVariable(func.params[i], this.args[i], true);
        }
        interpreter.updateFrame(this, 3, (draft) => {
          draft.hasNamespace = true;
        });
        interpreter.pushFrame(func.body);
        break;
      }
      case 3: {
        interpreter.popFrame();
        break;
      }
      case 4: {
        const result = interpreter.invokeFunction(this.node.name, this.args);
        if (result instanceof Promise) {
          return result.then(() => {
            interpreter.popFrame();
          });
        } else {
          interpreter.popFrame();
        }
      }
    }
  }

  dispose(interpreter: Interpreter) {
    if (this.hasNamespace) {
      interpreter.popNamespace();
    }
  }

  isFlowBoundary(flow: 'loop' | 'call') {
    return true;
  }
}
