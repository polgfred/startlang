import { Interpreter } from '../interpreter';

import { Frame, ValueNode } from './base';

export class CallNode extends ValueNode {
  constructor(
    public name: string,
    public args: ValueNode[]
  ) {
    super();
  }

  makeFrame() {
    return new CallFrame(this);
  }
}

export class CallFrame extends Frame {
  flowMarker = 'call' as const;
  count: number = 0;
  args: any[] = [];

  constructor(public node: CallNode) {
    super();
  }

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
          interpreter.setVariable(func.params[i], this.args[i]);
        }
        interpreter.updateFrame(this, 3);
        interpreter.pushFrame(func.body);
        break;
      }
      case 3: {
        interpreter.popNamespace();
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
}
