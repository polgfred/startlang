import { Interpreter } from '../interpreter.js';

import { Frame, Node } from './base.js';

export class CallNode extends Node {
  constructor(
    public readonly name: string,
    public readonly args: Node[],
    public readonly body: Node | null
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
  readonly args: unknown[] = [];
  readonly hasNamespace: boolean = false;

  visit(interpreter: Interpreter) {
    const { name, args, body } = this.node;

    switch (this.state) {
      case 0: {
        if (this.count < args.length) {
          interpreter.swapFrame(this, 1);
          interpreter.pushFrame(args[this.count]);
        } else if (name in interpreter.globalFunctions) {
          interpreter.swapFrame(this, 2);
        } else {
          interpreter.swapFrame(this, 3);
        }
        break;
      }
      case 1: {
        interpreter.swapFrame(this, 0, (draft) => {
          draft.args[this.count] = interpreter.lastResult;
          draft.count++;
        });
        break;
      }
      case 2: {
        const func = interpreter.globalFunctions[name];
        interpreter.pushNamespace();
        for (let i = 0; i < func.params.length; i++) {
          interpreter.setVariable(func.params[i], this.args[i]);
        }
        interpreter.swapFrame(this, 6, (draft) => {
          draft.hasNamespace = true;
        });
        interpreter.pushFrame(func.body);
        break;
      }
      case 3: {
        const func = interpreter.getRuntimeFunction(name, this.args);
        if (body && func.length < 3) {
          throw new Error(`function ${name} does not support do-blocks`);
        }
        interpreter.swapFrame(this, 4);
        return func(interpreter, this.args);
      }
      case 4: {
        if (body) {
          interpreter.swapFrame(this, 5);
          interpreter.pushFrame(body);
        } else {
          interpreter.swapFrame(this, 6);
        }
        break;
      }
      case 5: {
        const func = interpreter.getRuntimeFunction(name, this.args);
        interpreter.swapFrame(this, 6);
        return func(interpreter, this.args, true);
      }
      case 6: {
        interpreter.popFrame();
        break;
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
