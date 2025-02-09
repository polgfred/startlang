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
    return this.parent;
  }
}
