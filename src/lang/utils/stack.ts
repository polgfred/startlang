export class Stack<T> {
  constructor(
    public value: T,
    public parent: Stack<T> | null = null
  ) {
    Object.freeze(this);
  }

  swap(value: T) {
    return new Stack(value, this.parent);
  }

  push(value: T) {
    return new Stack(value, this);
  }

  pop() {
    if (!this.parent) {
      throw new Error('cannot pop bottom frame');
    }
    return this.parent;
  }
}
