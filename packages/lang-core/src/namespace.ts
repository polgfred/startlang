import { original, produce, type Producer } from 'immer';

import type { IndexType, NamespaceType } from './types.js';
import { Cons } from './utils/cons.js';

interface IndexHandler {
  getIndex(value: unknown, index: IndexType): unknown;
  setIndex(value: unknown, index: IndexType, element: unknown): void;
  deleteIndex(value: unknown, index: IndexType): void;
}

type IndexHandlerResolver = (value: unknown) => IndexHandler;

const emptyObject: NamespaceType = Object.freeze(Object.create(null));

export class Namespace {
  globalNamespace: NamespaceType = emptyObject;
  localNamespaces: Cons<NamespaceType> | null = null;

  constructor(private readonly getHandler: IndexHandlerResolver) {}

  get localNamespace() {
    return this.localNamespaces?.head ?? emptyObject;
  }

  reset() {
    this.globalNamespace = emptyObject;
    this.localNamespaces = null;
  }

  popOut() {
    this.localNamespaces = null;
  }

  push(producer?: Producer<Record<string, unknown>>) {
    const namespace = producer ? produce(emptyObject, producer) : emptyObject;
    this.localNamespaces = this.localNamespaces
      ? this.localNamespaces.push(namespace)
      : new Cons(namespace);
  }

  pop() {
    if (!this.localNamespaces) {
      throw new Error('cannot pop local namespace');
    }
    this.localNamespaces = this.localNamespaces.tail;
  }

  getVariable(name: string) {
    if (name in this.localNamespace) {
      return this.localNamespace[name];
    } else {
      return this.globalNamespace[name];
    }
  }

  setVariable(name: string, value: unknown) {
    if (this.localNamespaces) {
      this.setTopVariable(name, value);
    } else {
      this.setGlobalVariable(name, value);
    }
  }

  deleteVariable(name: string) {
    if (this.localNamespaces) {
      this.deleteTopVariable(name);
    } else {
      this.deleteGlobalVariable(name);
    }
  }

  setGlobalVariable(name: string, value: unknown) {
    this.globalNamespace = produce(this.globalNamespace, (draft) => {
      draft[name] = value;
    });
  }

  deleteGlobalVariable(name: string) {
    this.globalNamespace = produce(this.globalNamespace, (draft) => {
      Reflect.deleteProperty(draft, name);
    });
  }

  setLocalVariable(name: string, value: unknown) {
    this.requireLocalVariable(name);
    this.setTopVariable(name, value);
  }

  deleteLocalVariable(name: string) {
    this.requireLocalVariable(name);
    this.deleteTopVariable(name);
  }

  getVariableIndex(name: string, indexes: readonly IndexType[]) {
    return indexes.reduce((value, index) => {
      const handler = this.getHandler(value);
      return handler.getIndex(value, index);
    }, this.getVariable(name));
  }

  setVariableIndex(
    name: string,
    indexes: readonly IndexType[],
    value: unknown
  ) {
    this.setVariable(name, this.produceIndexedValue(name, indexes, value));
  }

  deleteVariableIndex(name: string, indexes: readonly IndexType[]) {
    this.setVariable(name, this.produceDeletedIndexedValue(name, indexes));
  }

  setGlobalVariableIndex(
    name: string,
    indexes: readonly IndexType[],
    value: unknown
  ) {
    this.setGlobalVariable(
      name,
      this.produceIndexedValueFrom(this.globalNamespace[name], indexes, value)
    );
  }

  deleteGlobalVariableIndex(name: string, indexes: readonly IndexType[]) {
    this.setGlobalVariable(
      name,
      this.produceDeletedIndexedValueFrom(this.globalNamespace[name], indexes)
    );
  }

  setLocalVariableIndex(
    name: string,
    indexes: readonly IndexType[],
    value: unknown
  ) {
    const currentValue = this.requireLocalVariable(name);
    this.setTopVariable(
      name,
      this.produceIndexedValueFrom(currentValue, indexes, value)
    );
  }

  deleteLocalVariableIndex(name: string, indexes: readonly IndexType[]) {
    const currentValue = this.requireLocalVariable(name);
    this.setTopVariable(
      name,
      this.produceDeletedIndexedValueFrom(currentValue, indexes)
    );
  }

  restore(
    globalNamespace: NamespaceType,
    localNamespaces: Cons<NamespaceType> | null
  ) {
    this.globalNamespace = globalNamespace;
    this.localNamespaces = localNamespaces;
  }

  private setTopVariable(name: string, value: unknown) {
    if (!this.localNamespaces) {
      throw new Error('local namespace not found');
    }

    this.localNamespaces = this.localNamespaces.swap(
      produce(this.localNamespaces.head, (draft) => {
        draft[name] = value;
      })
    );
  }

  private deleteTopVariable(name: string) {
    if (!this.localNamespaces) {
      throw new Error('local namespace not found');
    }

    this.localNamespaces = this.localNamespaces.swap(
      produce(this.localNamespaces.head, (draft) => {
        Reflect.deleteProperty(draft, name);
      })
    );
  }

  private requireLocalVariable(name: string) {
    if (!this.localNamespaces) {
      throw new Error(`local variable ${name} not found`);
    }

    const namespace = this.localNamespaces.head;
    if (!(name in namespace)) {
      throw new Error(`local variable ${name} not found`);
    }

    return namespace[name];
  }

  private produceIndexedValue(
    name: string,
    indexes: readonly IndexType[],
    value: unknown
  ) {
    return this.produceIndexedValueFrom(this.getVariable(name), indexes, value);
  }

  private produceDeletedIndexedValue(
    name: string,
    indexes: readonly IndexType[]
  ) {
    return this.produceDeletedIndexedValueFrom(this.getVariable(name), indexes);
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
