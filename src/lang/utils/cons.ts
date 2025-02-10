export class Cons<T> {
  constructor(
    public head: T,
    public tail: Cons<T> | null = null
  ) {
    Object.freeze(this);
  }

  swap(value: T) {
    return new Cons(value, this.tail);
  }

  push(value: T) {
    return new Cons(value, this);
  }

  pop() {
    if (!this.tail) {
      throw new Error('cannot pop bottom frame');
    }
    return this.tail;
  }
}
