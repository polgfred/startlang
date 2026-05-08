import { original, produce, type Producer } from 'immer';

import type { DataHandler } from './handlers/base.js';
import type { IndexType, NamespaceType } from './types.js';
import { Cons } from './utils/cons.js';

type IndexHandler = Pick<DataHandler, 'getIndex' | 'setIndex' | 'deleteIndex'>;

type IndexHandlerResolver = (value: unknown) => IndexHandler;

const emptyObject: NamespaceType = Object.freeze(Object.create(null));

export class Namespace {
  constructor(
    private readonly getHandler: IndexHandlerResolver,
    public readonly values: NamespaceType = emptyObject
  ) {}

  has(name: string) {
    return name in this.values;
  }

  get(name: string) {
    return this.values[name];
  }

  set(name: string, value: unknown) {
    return new Namespace(
      this.getHandler,
      produce(this.values, (draft) => {
        draft[name] = value;
      })
    );
  }

  delete(name: string) {
    return new Namespace(
      this.getHandler,
      produce(this.values, (draft) => {
        Reflect.deleteProperty(draft, name);
      })
    );
  }

  getIndex(name: string, indexes: readonly IndexType[]) {
    return indexes.reduce((value, index) => {
      const handler = this.getHandler(value);
      return handler.getIndex(value, index);
    }, this.get(name));
  }

  setIndex(name: string, indexes: readonly IndexType[], value: unknown) {
    return this.set(
      name,
      this.produceIndexedValueFrom(this.get(name), indexes, value)
    );
  }

  deleteIndex(name: string, indexes: readonly IndexType[]) {
    return this.set(
      name,
      this.produceDeletedIndexedValueFrom(this.get(name), indexes)
    );
  }

  private produceIndexedValueFrom(
    currentValue: unknown,
    indexes: readonly IndexType[],
    value: unknown
  ) {
    return produce(currentValue, (draft: unknown) => {
      indexes.reduce((draft, index, i) => {
        const handler = this.getHandler(original(draft));
        if (i === indexes.length - 1) {
          handler.setIndex(draft, index, value);
        } else {
          return handler.getIndex(draft, index);
        }
      }, draft);
    });
  }

  private produceDeletedIndexedValueFrom(
    currentValue: unknown,
    indexes: readonly IndexType[]
  ) {
    return produce(currentValue, (draft: unknown) => {
      indexes.reduce((draft, index, i) => {
        const handler = this.getHandler(original(draft));
        if (i === indexes.length - 1) {
          handler.deleteIndex(draft, index);
        } else {
          return handler.getIndex(draft, index);
        }
      }, draft);
    });
  }
}

export class RuntimeNamespace {
  private global: Namespace;
  private locals: Cons<Namespace> | null = null;

  constructor(private readonly getHandler: IndexHandlerResolver) {
    this.global = new Namespace(getHandler);
  }

  get globalNamespace() {
    return this.global;
  }

  get globalValues() {
    return this.global.values;
  }

  get localNamespace() {
    return this.locals?.head ?? null;
  }

  get localValues() {
    return this.localNamespace?.values ?? emptyObject;
  }

  get localNamespaces() {
    return this.locals;
  }

  reset() {
    this.global = new Namespace(this.getHandler);
    this.locals = null;
  }

  popOut() {
    this.locals = null;
  }

  push(producer?: Producer<Record<string, unknown>>) {
    const values = producer ? produce(emptyObject, producer) : emptyObject;
    const namespace = new Namespace(this.getHandler, values);
    this.locals = this.locals ? this.locals.push(namespace) : new Cons(namespace);
  }

  pop() {
    if (!this.locals) {
      throw new Error('cannot pop local namespace');
    }
    this.locals = this.locals.tail;
  }

  getVariable(name: string) {
    if (this.locals?.head.has(name)) {
      return this.locals.head.get(name);
    } else {
      return this.global.get(name);
    }
  }

  setVariable(name: string, value: unknown) {
    if (this.locals) {
      this.setTopNamespace(this.locals.head.set(name, value));
    } else {
      this.setGlobalVariable(name, value);
    }
  }

  deleteVariable(name: string) {
    if (this.locals) {
      this.setTopNamespace(this.locals.head.delete(name));
    } else {
      this.deleteGlobalVariable(name);
    }
  }

  setGlobalVariable(name: string, value: unknown) {
    this.global = this.global.set(name, value);
  }

  deleteGlobalVariable(name: string) {
    this.global = this.global.delete(name);
  }

  setLocalVariable(name: string, value: unknown) {
    this.requireLocalNamespace(name);
    this.setTopNamespace(this.requireTopNamespace().set(name, value));
  }

  deleteLocalVariable(name: string) {
    this.requireLocalNamespace(name);
    this.setTopNamespace(this.requireTopNamespace().delete(name));
  }

  getVariableIndex(name: string, indexes: readonly IndexType[]) {
    if (this.locals?.head.has(name)) {
      return this.locals.head.getIndex(name, indexes);
    } else {
      return this.global.getIndex(name, indexes);
    }
  }

  setVariableIndex(
    name: string,
    indexes: readonly IndexType[],
    value: unknown
  ) {
    this.setVariable(
      name,
      this.withResolvedVariable(name).setIndex(name, indexes, value).get(name)
    );
  }

  deleteVariableIndex(name: string, indexes: readonly IndexType[]) {
    this.setVariable(
      name,
      this.withResolvedVariable(name).deleteIndex(name, indexes).get(name)
    );
  }

  setGlobalVariableIndex(
    name: string,
    indexes: readonly IndexType[],
    value: unknown
  ) {
    this.global = this.global.setIndex(name, indexes, value);
  }

  deleteGlobalVariableIndex(name: string, indexes: readonly IndexType[]) {
    this.global = this.global.deleteIndex(name, indexes);
  }

  setLocalVariableIndex(
    name: string,
    indexes: readonly IndexType[],
    value: unknown
  ) {
    this.requireLocalNamespace(name);
    this.setTopNamespace(
      this.requireTopNamespace().setIndex(name, indexes, value)
    );
  }

  deleteLocalVariableIndex(name: string, indexes: readonly IndexType[]) {
    this.requireLocalNamespace(name);
    this.setTopNamespace(this.requireTopNamespace().deleteIndex(name, indexes));
  }

  restore(
    globalNamespace: Namespace,
    localNamespaces: Cons<Namespace> | null
  ) {
    this.global = globalNamespace;
    this.locals = localNamespaces;
  }

  private requireTopNamespace() {
    if (!this.locals) {
      throw new Error('local namespace not found');
    }
    return this.locals.head;
  }

  private requireLocalNamespace(name: string) {
    if (!this.locals) {
      throw new Error(`local variable ${name} not found`);
    }

    const namespace = this.locals.head;
    if (!namespace.has(name)) {
      throw new Error(`local variable ${name} not found`);
    }
    return namespace;
  }

  private setTopNamespace(namespace: Namespace) {
    if (!this.locals) {
      throw new Error('local namespace not found');
    }
    this.locals = this.locals.swap(namespace);
  }

  private withResolvedVariable(name: string) {
    return new Namespace(this.getHandler).set(name, this.getVariable(name));
  }
}
