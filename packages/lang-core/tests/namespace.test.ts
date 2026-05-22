import { describe, expect, it } from 'vitest';

import { Namespace, RuntimeNamespace } from '../src/namespace.js';
import type { IndexType } from '../src/types.js';

type IndexHandler = {
  getIndex(value: unknown, index: IndexType): unknown;
  setIndex(value: unknown, index: IndexType, element: unknown): void;
  deleteIndex(value: unknown, index: IndexType): void;
};

const listHandler: IndexHandler = {
  getIndex: (value, index) => (value as unknown[])[index as number],
  setIndex: (value, index, element) => {
    (value as unknown[])[index as number] = element;
  },
  deleteIndex: (value, index) => {
    (value as unknown[]).splice(index as number, 1);
  },
};

const recordHandler: IndexHandler = {
  getIndex: (value, index) =>
    (value as Record<string, unknown>)[index as string],
  setIndex: (value, index, element) => {
    (value as Record<string, unknown>)[index as string] = element;
  },
  deleteIndex: (value, index) => {
    delete (value as Record<string, unknown>)[index as string];
  },
};

function resolveHandler(value: unknown): IndexHandler {
  if (Array.isArray(value)) return listHandler;
  if (typeof value === 'object' && value !== null) return recordHandler;
  throw new Error(`no handler for ${typeof value}`);
}

describe('Namespace', () => {
  describe('basic operations', () => {
    it('starts with no entries', () => {
      const ns = new Namespace(resolveHandler);
      expect(ns.has('x')).toBe(false);
      expect(ns.get('x')).toBeUndefined();
      expect(Object.keys(ns.values)).toEqual([]);
    });

    it('reports has and get for existing entries', () => {
      const ns = new Namespace(resolveHandler).set('x', 1);
      expect(ns.has('x')).toBe(true);
      expect(ns.get('x')).toBe(1);
    });

    it('distinguishes a present undefined value from a missing key', () => {
      const ns = new Namespace(resolveHandler).set('x', undefined);
      expect(ns.has('x')).toBe(true);
      expect(ns.get('x')).toBeUndefined();
    });

    it('overwrites existing entries', () => {
      const ns = new Namespace(resolveHandler).set('x', 1).set('x', 2);
      expect(ns.get('x')).toBe(2);
    });

    it('deletes existing entries', () => {
      const ns = new Namespace(resolveHandler).set('x', 1).delete('x');
      expect(ns.has('x')).toBe(false);
      expect(ns.get('x')).toBeUndefined();
    });
  });

  describe('immutability', () => {
    it('set returns a new namespace and leaves the original untouched', () => {
      const original = new Namespace(resolveHandler);
      const originalValues = original.values;
      const updated = original.set('x', 1);

      expect(updated).not.toBe(original);
      expect(updated.values).not.toBe(originalValues);
      expect(original.values).toBe(originalValues);
      expect(original.has('x')).toBe(false);
      expect(updated.get('x')).toBe(1);
    });

    it('delete returns a new namespace and leaves the original untouched', () => {
      const original = new Namespace(resolveHandler).set('x', 1).set('y', 2);
      const previousValues = original.values;
      const updated = original.delete('x');

      expect(updated).not.toBe(original);
      expect(original.values).toBe(previousValues);
      expect(original.has('x')).toBe(true);
      expect(updated.has('x')).toBe(false);
      expect(updated.get('y')).toBe(2);
    });

    it('preserves structural sharing for unchanged entries', () => {
      const shared = { nested: [1, 2, 3] };
      const original = new Namespace(resolveHandler)
        .set('shared', shared)
        .set('other', 'hello');
      const updated = original.set('other', 'world');

      expect(updated.get('shared')).toBe(original.get('shared'));
    });

    it('setIndex on nested data does not mutate prior snapshots', () => {
      const original = new Namespace(resolveHandler).set('users', [
        { name: 'Ada' },
        { name: 'Grace' },
      ]);
      const beforeUsers = original.get('users');
      const updated = original.setIndex('users', [1, 'name'], 'Hopper');

      expect(updated.getIndex('users', [1, 'name'])).toBe('Hopper');
      expect(original.getIndex('users', [1, 'name'])).toBe('Grace');
      expect(original.get('users')).toBe(beforeUsers);
    });

    it('deleteIndex on nested data does not mutate prior snapshots', () => {
      const original = new Namespace(resolveHandler).set('list', [10, 20, 30]);
      const updated = original.deleteIndex('list', [1]);

      expect(updated.get('list')).toEqual([10, 30]);
      expect(original.get('list')).toEqual([10, 20, 30]);
    });
  });

  describe('indexed access', () => {
    it('walks a chain of indexes to read nested values', () => {
      const ns = new Namespace(resolveHandler).set('data', {
        users: [{ name: 'Ada' }, { name: 'Grace' }],
      });

      expect(ns.getIndex('data', ['users', 1, 'name'])).toBe('Grace');
    });

    it('returns the value itself when the index chain is empty', () => {
      const ns = new Namespace(resolveHandler).set('data', [1, 2, 3]);
      expect(ns.getIndex('data', [])).toEqual([1, 2, 3]);
    });

    it('writes through a chain of indexes', () => {
      const ns = new Namespace(resolveHandler)
        .set('data', { users: [{ name: 'Ada' }] })
        .setIndex('data', ['users', 0, 'name'], 'Hopper');

      expect(ns.getIndex('data', ['users', 0, 'name'])).toBe('Hopper');
    });

    it('deletes through a chain of indexes', () => {
      const ns = new Namespace(resolveHandler)
        .set('data', { items: [1, 2, 3] })
        .deleteIndex('data', ['items', 1]);

      expect(ns.getIndex('data', ['items'])).toEqual([1, 3]);
    });
  });
});

describe('RuntimeNamespace', () => {
  describe('initial state', () => {
    it('has an empty global namespace and no locals', () => {
      const rt = new RuntimeNamespace(resolveHandler);

      expect(rt.localNamespaces).toBeNull();
      expect(rt.localNamespace).toBeNull();
      expect(rt.localValues).toEqual({});
      expect(rt.globalValues).toEqual({});
      expect(rt.getVariable('x')).toBeUndefined();
    });
  });

  describe('without locals', () => {
    it('setVariable writes to the global namespace', () => {
      const rt = new RuntimeNamespace(resolveHandler);
      rt.setVariable('x', 1);

      expect(rt.getVariable('x')).toBe(1);
      expect(rt.globalValues.x).toBe(1);
    });

    it('deleteVariable removes from the global namespace', () => {
      const rt = new RuntimeNamespace(resolveHandler);
      rt.setVariable('x', 1);
      rt.deleteVariable('x');

      expect(rt.getVariable('x')).toBeUndefined();
      expect(rt.globalValues.x).toBeUndefined();
    });
  });

  describe('local push and pop', () => {
    it('push initializes an empty local when no producer is given', () => {
      const rt = new RuntimeNamespace(resolveHandler);
      rt.push();

      expect(rt.localNamespace).not.toBeNull();
      expect(rt.localValues).toEqual({});
    });

    it('push runs a producer to seed local values', () => {
      const rt = new RuntimeNamespace(resolveHandler);
      rt.push((draft) => {
        draft.a = 1;
        draft.b = 2;
      });

      expect(rt.localValues).toEqual({ a: 1, b: 2 });
    });

    it('push always seeds a fresh local, regardless of stack depth', () => {
      const rt = new RuntimeNamespace(resolveHandler);
      rt.push((draft) => {
        draft.outer = 1;
      });
      rt.push();

      expect(rt.localValues).toEqual({});
    });

    it('pop restores the prior local namespace', () => {
      const rt = new RuntimeNamespace(resolveHandler);
      rt.push((draft) => {
        draft.depth = 1;
      });
      rt.push((draft) => {
        draft.depth = 2;
      });
      expect(rt.localValues.depth).toBe(2);

      rt.pop();
      expect(rt.localValues.depth).toBe(1);

      rt.pop();
      expect(rt.localNamespace).toBeNull();
    });

    it('throws when popping with no locals', () => {
      const rt = new RuntimeNamespace(resolveHandler);
      expect(() => rt.pop()).toThrow('cannot pop local namespace');
    });
  });

  describe('shadowing with locals', () => {
    it('getVariable reads from the top local when the name exists there', () => {
      const rt = new RuntimeNamespace(resolveHandler);
      rt.setGlobalVariable('x', 'global');
      rt.push((draft) => {
        draft.x = 'local';
      });

      expect(rt.getVariable('x')).toBe('local');
    });

    it('getVariable falls back to global when the name is not in the top local', () => {
      const rt = new RuntimeNamespace(resolveHandler);
      rt.setGlobalVariable('x', 'global');
      rt.push();

      expect(rt.getVariable('x')).toBe('global');
    });

    it('getVariable only checks the top local, not lower ones', () => {
      const rt = new RuntimeNamespace(resolveHandler);
      rt.setGlobalVariable('x', 'global');
      rt.push((draft) => {
        draft.x = 'middle';
      });
      rt.push();

      expect(rt.getVariable('x')).toBe('global');
    });

    it('setVariable always writes to the top local when locals exist', () => {
      const rt = new RuntimeNamespace(resolveHandler);
      rt.setGlobalVariable('x', 'global');
      rt.push();
      rt.setVariable('x', 'local');

      expect(rt.localValues.x).toBe('local');
      expect(rt.globalValues.x).toBe('global');
    });

    it('deleteVariable removes from the top local when the name lives there', () => {
      const rt = new RuntimeNamespace(resolveHandler);
      rt.setGlobalVariable('x', 'global');
      rt.push((draft) => {
        draft.x = 'local';
      });
      rt.deleteVariable('x');

      expect(rt.localValues.x).toBeUndefined();
      expect(rt.globalValues.x).toBe('global');
      expect(rt.getVariable('x')).toBe('global');
    });

    it('deleteVariable does not touch the global when called from a local scope', () => {
      const rt = new RuntimeNamespace(resolveHandler);
      rt.setGlobalVariable('x', 'global');
      rt.push();
      rt.deleteVariable('x');

      expect(rt.globalValues.x).toBe('global');
      expect(rt.getVariable('x')).toBe('global');
    });
  });

  describe('explicit global writes', () => {
    it('setGlobalVariable bypasses locals', () => {
      const rt = new RuntimeNamespace(resolveHandler);
      rt.push((draft) => {
        draft.x = 'local';
      });
      rt.setGlobalVariable('x', 'global');

      expect(rt.globalValues.x).toBe('global');
      expect(rt.localValues.x).toBe('local');
    });

    it('deleteGlobalVariable bypasses locals', () => {
      const rt = new RuntimeNamespace(resolveHandler);
      rt.setGlobalVariable('x', 'global');
      rt.push((draft) => {
        draft.x = 'local';
      });
      rt.deleteGlobalVariable('x');

      expect(rt.globalValues.x).toBeUndefined();
      expect(rt.localValues.x).toBe('local');
    });
  });

  describe('explicit local writes', () => {
    it('setLocalVariable throws when no local namespace exists', () => {
      const rt = new RuntimeNamespace(resolveHandler);
      expect(() => rt.setLocalVariable('x', 1)).toThrow(
        'local variable x not found'
      );
    });

    it('setLocalVariable throws when the name is not already in the top local', () => {
      const rt = new RuntimeNamespace(resolveHandler);
      rt.push();
      expect(() => rt.setLocalVariable('x', 1)).toThrow(
        'local variable x not found'
      );
    });

    it('setLocalVariable updates an existing local in place', () => {
      const rt = new RuntimeNamespace(resolveHandler);
      rt.push((draft) => {
        draft.x = 'old';
      });
      rt.setLocalVariable('x', 'new');

      expect(rt.localValues.x).toBe('new');
    });

    it('deleteLocalVariable requires the name on the top local', () => {
      const rt = new RuntimeNamespace(resolveHandler);
      rt.push((draft) => {
        draft.keep = 1;
      });

      expect(() => rt.deleteLocalVariable('missing')).toThrow(
        'local variable missing not found'
      );
      rt.deleteLocalVariable('keep');
      expect(rt.localValues.keep).toBeUndefined();
    });
  });

  describe('indexed variable access', () => {
    it('getVariableIndex reads from the local when shadowed, else from the global', () => {
      const rt = new RuntimeNamespace(resolveHandler);
      rt.setGlobalVariable('data', { value: 'global' });
      rt.push((draft) => {
        draft.data = { value: 'local' };
      });

      expect(rt.getVariableIndex('data', ['value'])).toBe('local');
      rt.pop();
      expect(rt.getVariableIndex('data', ['value'])).toBe('global');
    });

    it('setVariableIndex updates a local when the variable already lives in the local', () => {
      const rt = new RuntimeNamespace(resolveHandler);
      rt.push((draft) => {
        draft.data = { value: 1 };
      });
      rt.setVariableIndex('data', ['value'], 2);

      expect(rt.localValues.data).toEqual({ value: 2 });
    });

    it('setVariableIndex on a global-only var writes the change into the top local', () => {
      const rt = new RuntimeNamespace(resolveHandler);
      rt.setGlobalVariable('data', { value: 'global' });
      rt.push();
      rt.setVariableIndex('data', ['value'], 'shadowed');

      expect(rt.localValues.data).toEqual({ value: 'shadowed' });
      expect(rt.globalValues.data).toEqual({ value: 'global' });
    });

    it('deleteVariableIndex on a global-only var writes the change into the top local', () => {
      const rt = new RuntimeNamespace(resolveHandler);
      rt.setGlobalVariable('list', [1, 2, 3]);
      rt.push();
      rt.deleteVariableIndex('list', [1]);

      expect(rt.localValues.list).toEqual([1, 3]);
      expect(rt.globalValues.list).toEqual([1, 2, 3]);
    });

    it('setGlobalVariableIndex updates the global regardless of locals', () => {
      const rt = new RuntimeNamespace(resolveHandler);
      rt.setGlobalVariable('list', [1, 2, 3]);
      rt.push((draft) => {
        draft.list = [9, 9];
      });
      rt.setGlobalVariableIndex('list', [0], 100);

      expect(rt.globalValues.list).toEqual([100, 2, 3]);
      expect(rt.localValues.list).toEqual([9, 9]);
    });

    it('deleteGlobalVariableIndex updates the global regardless of locals', () => {
      const rt = new RuntimeNamespace(resolveHandler);
      rt.setGlobalVariable('list', [1, 2, 3]);
      rt.push((draft) => {
        draft.list = [9, 9];
      });
      rt.deleteGlobalVariableIndex('list', [1]);

      expect(rt.globalValues.list).toEqual([1, 3]);
      expect(rt.localValues.list).toEqual([9, 9]);
    });

    it('setLocalVariableIndex requires the name on the top local', () => {
      const rt = new RuntimeNamespace(resolveHandler);
      rt.push();
      expect(() => rt.setLocalVariableIndex('missing', [0], 1)).toThrow(
        'local variable missing not found'
      );
    });

    it('setLocalVariableIndex updates nested local data', () => {
      const rt = new RuntimeNamespace(resolveHandler);
      rt.push((draft) => {
        draft.list = [1, 2, 3];
      });
      rt.setLocalVariableIndex('list', [1], 20);

      expect(rt.localValues.list).toEqual([1, 20, 3]);
    });

    it('deleteLocalVariableIndex requires the name on the top local', () => {
      const rt = new RuntimeNamespace(resolveHandler);
      rt.push();
      expect(() => rt.deleteLocalVariableIndex('missing', [0])).toThrow(
        'local variable missing not found'
      );
    });

    it('deleteLocalVariableIndex updates nested local data', () => {
      const rt = new RuntimeNamespace(resolveHandler);
      rt.push((draft) => {
        draft.list = [1, 2, 3];
      });
      rt.deleteLocalVariableIndex('list', [1]);

      expect(rt.localValues.list).toEqual([1, 3]);
    });
  });

  describe('snapshot reset and restore', () => {
    it('reset clears global values and locals', () => {
      const rt = new RuntimeNamespace(resolveHandler);
      rt.setGlobalVariable('x', 1);
      rt.push((draft) => {
        draft.y = 2;
      });
      rt.reset();

      expect(rt.globalValues).toEqual({});
      expect(rt.localNamespace).toBeNull();
    });

    it('restore swaps in a complete prior namespace state', () => {
      const rt = new RuntimeNamespace(resolveHandler);
      rt.setGlobalVariable('g', 'g1');
      rt.push((draft) => {
        draft.l = 'l1';
      });
      const savedGlobal = rt.globalNamespace;
      const savedLocals = rt.localNamespaces;

      rt.setGlobalVariable('g', 'g2');
      rt.setVariable('l', 'l2');
      rt.push((draft) => {
        draft.deeper = true;
      });

      rt.restore(savedGlobal, savedLocals);

      expect(rt.globalValues.g).toBe('g1');
      expect(rt.localValues.l).toBe('l1');
      expect(rt.localValues.deeper).toBeUndefined();
      expect(rt.localNamespaces?.tail).toBeNull();
    });

    it('restore can collapse locals back to null', () => {
      const rt = new RuntimeNamespace(resolveHandler);
      rt.push();
      rt.restore(rt.globalNamespace, null);

      expect(rt.localNamespace).toBeNull();
    });

    it('continuing to mutate does not affect previously captured snapshots', () => {
      const rt = new RuntimeNamespace(resolveHandler);
      rt.setGlobalVariable('counter', 1);
      rt.push((draft) => {
        draft.x = 10;
      });

      const snapshotGlobal = rt.globalNamespace;
      const snapshotLocals = rt.localNamespaces;
      if (!snapshotLocals) throw new Error('expected locals after push');
      const snapshotGlobalValues = snapshotGlobal.values;
      const snapshotLocalValues = snapshotLocals.head.values;

      rt.setGlobalVariable('counter', 2);
      rt.setVariable('x', 20);

      expect(snapshotGlobal.values).toBe(snapshotGlobalValues);
      expect(snapshotGlobalValues.counter).toBe(1);
      expect(snapshotLocals.head.values).toBe(snapshotLocalValues);
      expect(snapshotLocalValues.x).toBe(10);
    });
  });
});
