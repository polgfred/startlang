import { Interpreter } from '../interpreter.js';

import { Frame, Node, type UnwindAction, type UnwindSignal } from './base.js';

export abstract class CallNode extends Node {
  constructor(
    public readonly name: string,
    public readonly args: readonly Node[],
    public readonly body: Node | null
  ) {
    super();
  }

  makeFrame() {
    return new CallFrame(this);
  }
}

export class CallExpressionNode extends CallNode {}

export class CallStatementNode extends CallNode {
  override readonly isStatement = true;
}

export class CallFrame extends Frame {
  declare node: CallNode;

  readonly args: unknown[] = [];
  readonly count: number = 0;

  visit(interpreter: Interpreter) {
    const { name, args } = this.node;

    switch (this.state) {
      case 0: {
        if (this.count < args.length) {
          interpreter.swapFrame(this, 1);
          interpreter.pushNode(args[this.count]);
        } else if (name in interpreter.globalFunctions) {
          interpreter.replaceFrame(new CallGlobalFrame(this.node, this.args));
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
        const func = interpreter.getRuntimeFunction(name, this.args);
        const result = func(interpreter, this.args, this.node);
        if (result instanceof Frame) {
          interpreter.replaceFrame(result);
        } else {
          interpreter.popFrame();
        }
        break;
      }
    }
  }

  override onUnwind(signal: UnwindSignal): UnwindAction {
    return 'stop-after';
  }
}

export abstract class CallBodyFrame extends Frame {
  declare node: CallNode;

  override onUnwind(signal: UnwindSignal): UnwindAction {
    return 'stop-after';
  }
}

class CallGlobalFrame extends CallBodyFrame {
  constructor(
    node: CallNode,
    readonly args: unknown[]
  ) {
    super(node);
  }

  visit(interpreter: Interpreter) {
    const { name } = this.node;

    switch (this.state) {
      case 0: {
        const func = interpreter.globalFunctions[name];
        interpreter.swapFrame(this, 1);
        interpreter.pushNode(func.body);
        break;
      }
      case 1: {
        interpreter.popFrame();
        break;
      }
    }
  }

  override onEnter(interpreter: Interpreter): void {
    const { name } = this.node;
    const func = interpreter.globalFunctions[name];
    interpreter.pushNamespace((draft) => {
      for (let i = 0; i < func.params.length; i++) {
        draft[func.params[i]] = this.args[i];
      }
    });
  }

  override onExit(interpreter: Interpreter) {
    interpreter.popNamespace();
  }
}
