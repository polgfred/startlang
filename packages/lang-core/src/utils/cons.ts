export class Cons<T> {
  constructor(
    public readonly head: T,
    public readonly tail: Cons<T> | null = null
  ) {}

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
