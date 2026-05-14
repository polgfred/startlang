import { Frame, Node } from './base.js';

export class BeginNode extends Node {
  override readonly isStatement = true;

  constructor(
    public readonly name: string,
    public readonly params: readonly string[],
    public readonly body: Node
  ) {
    super();
  }

  makeFrame(): Frame {
    throw new Error('BeginNode is a static declaration and cannot be executed');
  }
}
