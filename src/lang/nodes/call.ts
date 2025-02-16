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

  visit(interpreter: Interpreter) {
    const { name, args } = this.node;

    switch (this.state) {
      case 0: {
        if (this.count < args.length) {
          interpreter.swapFrame(this, 1);
          interpreter.pushFrame(args[this.count]);
        } else {
          interpreter.swapFrame(this, 2);
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
        const frame =
          name in interpreter.globalFunctions
            ? new CallGlobalFrame(this.node)
            : new CallRuntimeFrame(this.node);
        interpreter.swapFrame(frame, null, (draft) => {
          draft.args = this.args;
        });
      }
    }
  }

  isFlowBoundary(flow: 'loop' | 'call') {
    return true;
  }
}

class CallGlobalFrame extends CallFrame {
  visit(interpreter: Interpreter) {
    const { name } = this.node;

    switch (this.state) {
      case 0: {
        const func = interpreter.globalFunctions[name];
        interpreter.pushNamespace();
        for (let i = 0; i < func.params.length; i++) {
          interpreter.setVariable(func.params[i], this.args[i]);
        }
        interpreter.swapFrame(this, 1);
        interpreter.pushFrame(func.body);
        break;
      }
      case 1: {
        interpreter.popFrame();
        break;
      }
    }
  }

  dispose(interpreter: Interpreter) {
    interpreter.popNamespace();
  }
}

class CallRuntimeFrame extends CallFrame {
  visit(interpreter: Interpreter) {
    const { name, body } = this.node;

    const func = interpreter.getRuntimeFunction(name, this.args);

    switch (this.state) {
      case 0: {
        if (body && func.length < 3) {
          throw new Error(`function ${name} does not support do-blocks`);
        }
        interpreter.swapFrame(this, 1);
        return func(interpreter, this.args, false);
      }
      case 1: {
        if (body) {
          interpreter.swapFrame(this, 2);
          interpreter.pushFrame(body);
        } else {
          interpreter.swapFrame(this, 3);
        }
        break;
      }
      case 2: {
        interpreter.swapFrame(this, 3);
        return func(interpreter, this.args, true);
      }
      case 3: {
        interpreter.popFrame();
        break;
      }
    }
  }
}
