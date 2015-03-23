import util from 'util';
import immutable from 'immutable';
import { extendObject } from './utils';

// ensures its operands are of the same type
export function checkOp(fn) {
  return function(left, right) {
    if (handle(left) !== handle(right)) {
      throw new Error('operands must be of the same type');
    }
    // forward onto the original
    return fn(left, right);
  };
}

// the above, plus ensures that its return value is not NaN
export function checkMathOp(fn) {
  return function(left, right) {
    if (handle(left) !== handle(right)) {
      throw new Error('operands must be of the same type');
    }
    // forward onto the original
    let result = fn(left, right);
    // check for valid result
    if (result !== result) {
      throw new Error('result is not a number');
    }
    return result;
  };
}

// Environment

export class SRuntime {
  constructor() {
    this.fn = immutable.Map();
    this.ns = immutable.Map();
    this.stack = immutable.Stack();
  }

  // push and pop new objects onto the ns stack
  push() {
    this.stack = this.stack.push(this.ns);
    this.ns = immutable.Map();
  }

  pop() {
    this.ns = this.stack.first();
    this.stack = this.stack.pop();
  }

  get(name) {
    // look in the current ns
    let result = this.ns.get(name);
    if (typeof result != 'undefined') {
      return result;
    }

    // look up the stack (should we do this?)
    let iter = this.stack.values();
    while (true) {
      let next = iter.next();
      if (next.done) {
        break;
      }
      result = next.value.get(name);
      if (typeof result != 'undefined') {
        return result;
      }
    }
  }

  set(name, value) {
    // always in the current ns only
    this.ns = this.ns.set(name, value);
  }

  getindex(name, indexes) {
    let max = indexes.length - 1;
    return next(this.get(name), 0);

    function next(b, i) {
      let h = handle(b), idx = indexes[i];
      return (i == max) ?
                h.getindex(b, idx) :
                next(h.getindex(b, idx), i + 1);
    }
  }

  setindex(name, indexes, value) {
    let max = indexes.length - 1;
    this.set(name, next(this.get(name), 0));

    function next(b, i) {
      let h = handle(b), idx = indexes[i];
      return (i == max) ?
                h.setindex(b, idx, value) :
                h.setindex(b, idx, next(h.getindex(b, idx), i + 1));
    }
  }

  enumerate(value) {
    return handle(value).enumerate(value);
  }

  unaryop(op, right) {
    return handle(right).unaryops[op](right);
  }

  binaryop(op, left, right) {
    return handle(left).binaryops[op](left, right);
  }

  getfn(name, obj) {
    // look for a user-defined function
    let fn = this.fn.get(name);
    if (fn) {
      return fn;
    }
    // look for a built-in function by first argument, or in global map
    fn = (obj != null && handle(obj).methods[name]) || globals[name];
    if (fn) {
      return (args, assn) => {
        return this.syscall(fn, args, assn);
      };
    }
    throw new Error('object not found or not a function');
  }

  setfn(name, body) {
    this.fn = this.fn.set(name, body);
  }

  syscall(fn, args, assn) {
    // call a runtime function
    let res = fn(...args);
    if (res) {
      let repl = res['@@__assign__@@'];
      if (repl) {
        // if this result contains replacement args, assign them
        if (!Array.isArray(repl)) {
          repl = [ repl ];
        }
        // loop over replacement args
        for (let i = 0; i < repl.length; ++i) {
          let r = repl[i];
          if (typeof r != 'undefined') {
            // we have a replacement for this slot
            let a = assn[i];
            if (a) {
              // this slot can be assigned to
              if (a.indexes) {
                this.setindex(a.name, a.indexes, r);
              } else {
                this.set(a.name, r);
              }
            }
          }
        }
        // grab an explicit result, or the first replacement
        res = res['@@__result__@@'] || repl[0];
      }
    }

    return res;
  }
}

// Handler defaults

export const SBase = {
  enumerate() {
    throw new Error('object does not support iteration');
  },

  getindex() {
    throw new Error('object does not support []');
  },

  setindex() {
    throw new Error('object does not support []');
  },

  methods: [],

  unaryops: {},

  binaryops: {
    // standard comparison operators
    '=' : (left, right) => left === right,
    '!=': (left, right) => left !== right,

    '<' : checkOp((left, right) => left <  right),
    '<=': checkOp((left, right) => left <= right),
    '>' : checkOp((left, right) => left >  right),
    '>=': checkOp((left, right) => left >= right)
  }
};

// Handler definitions

export const SNone = extendObject(SBase, {
  repr() {
    return '*none*';
  }
});

export const SBoolean = extendObject(SBase, {
  repr(b) {
    return b ? '*true*' : '*false*';
  }
});

Object.defineProperty(Boolean.prototype, '@@__handler__@@', {
  value: SBoolean,
  enumerable: false
});

export const SNumber = extendObject(SBase, {
  repr(n) {
    if (isFinite(n)) {
      return String(n);
    } else {
      return n > 0 ? '*infinity*' : '-*infinity*';
    }
  },

  methods: [
    'abs',
    'acos',
    'asin',
    'atan',
    'ceil',
    'cos',
    'exp',
    'floor',
    'log',
    'round',
    'sin',
    'sqrt',
    'tan',
    'pow',
    'max',
    'min'
  ].reduce((ns, method) => {
    ns[method] = function(...args) {
      // forward onto built-in Math function
      var result = Math[method](...args);
      // check for valid result
      if (result !== result) {
        throw new Error('result is not a number');
      }
      return result;
    };
    return ns;
  }, {
    inc(n) {
      return { '@@__assign__@@': n + 1 };
    },

    dec(n) {
      return { '@@__assign__@@': n - 1 };
    },

    random(n) {
      return Math.random() * n;
    },

    range(start, end, step) {
      return immutable.Range(start, end, step);
    }
  }),

  unaryops: {
    // math
    '+': (right) => +right,
    '-': (right) => -right,
    // bitwise
    '~': (right) => ~right
  },

  binaryops: extendObject(SBase.binaryops, {
    // math
    '+': checkMathOp((left, right) => left + right),
    '-': checkMathOp((left, right) => left - right),
    '*': checkMathOp((left, right) => left * right),
    '/': checkMathOp((left, right) => left / right),
    '%': checkMathOp((left, right) => left % right),
    '**': checkMathOp((left, right) => Math.pow(left, right)),
    // bitwise
    '&': checkMathOp((left, right) => left & right),
    '|': checkMathOp((left, right) => left | right),
    '^': checkMathOp((left, right) => left ^ right)
  })
});

Object.defineProperty(Number.prototype, '@@__handler__@@', {
  value: SNumber,
  enumerable: false
});

export const SRange = extendObject(SBase, {
  repr(r) {
    return `[ ${r._start} .. ${r._end} / ${r._step} ]`;
  },

  enumerate(r, current = r._start) {
    return {
      value: current,
      more: r._step > 0 ? current <= r._end : current >= r._end,
      next: () => SRange.enumerate(r, current + r._step)
    };
  },

  methods: {
    len(r) {
      return Math.ceil((r._end - r._start) / r._step);
    }
  },

  binaryops: {
    '=' : (left, right) =>  left.equals(right),
    '!=': (left, right) => !left.equals(right)
  }
});

Object.defineProperty(immutable.Range.prototype, '@@__handler__@@', {
  value: SRange,
  enumerable: false
});

export const SString = extendObject(SBase, {
  repr(s) {
    return s;
  },

  enumerate(s, index = 0) {
    return {
      value: s.charAt(index),
      more: index < s.length,
      next: () => SString.enumerate(s, index + 1)
    };
  },

  getindex(s, index) {
    return s.charAt(index);
  },

  setindex(s, index, value) {
    return s.substr(0, index) + value + s.substr(index + 1);
  },

  methods: {
    len(s) {
      return s.length;
    },

    find(s, search) {
      let pos = s.indexOf(search);
      return pos >= 0 ? pos : null;
    },

    findlast(s, search) {
      let pos = s.lastIndexOf(search);
      return pos >= 0 ? pos : null;
    },

    range(s, at, length) {
      return s.substr(at, length);
    },

    insert(s, at, more) {
      return { '@@__assign__@@': s.substr(0, at) + more + s.substr(at) };
    },

    remove(s, at, length) {
      return {
        '@@__assign__@@': s.substr(0, at) + s.substr(at + length),
        '@@__result__@@': s.substr(at, length)
      };
    },

    replace(s, at, length, more) {
      return {
        '@@__assign__@@': s.substr(0, at) + more + s.substr(at + length),
        '@@__result__@@': s.substr(at, length)
      };
    },

    sub(s, search, to) {
      return { '@@__assign__@@': s.replace(search, to) };
    },

    split(s, delim) {
      return s.split(delim || ' ');
    },

    upper(s) {
      return s.toUpperCase();
    },

    lower(s) {
      return s.toLowerCase();
    }
  },

  binaryops: extendObject(SBase.binaryops, {
    '$': (left, right) => left + handle(right).repr(right)
  })
});

Object.defineProperty(String.prototype, '@@__handler__@@', {
  value: SString,
  enumerable: false
});

// Containers

export const SContainer = extendObject(SBase, {
  getindex(c, index) {
    return c.get(index);
  },

  setindex(c, index, value) {
    return c.set(index, value);
  },

  binaryops: {
    '=' : (left, right) =>  left.equals(right),
    '!=': (left, right) => !left.equals(right)
  }
});

// Lists

export const SList = extendObject(SContainer, {
  create(dims) {
    // optimize for the usual case
    if (dims.length == 0) {
      return immutable.List();
    }
    // create an n-dimensional nested list
    let subList = ([ next, ...rest ]) => {
      return immutable.List().withMutations((sub) => {
        for (let i = 0; i < next; ++i) {
          sub.set(i, rest.length > 0 ? subList(rest) : null);
        }
      });
    }
    return subList(dims);
  },

  repr(l) {
    return '[ ' + l.map((el) => handle(el).repr(el)).join(', ') + ' ]';
  },

  enumerate(l, index = 0) {
    return {
      value: l.get(index),
      more: index < l.size,
      next: () => SList.enumerate(l, index + 1)
    };
  },

  methods: {
    len(l) {
      return l.size;
    },

    find(l, search) {
      let pos = l.indexOf(search);
      return pos >= 0 ? pos : null;
    },

    findlast(l, search) {
      let pos = l.lastIndexOf(search);
      return pos >= 0 ? pos : null;
    },

    range(l, at, length) {
      return l.slice(at, at + length);
    },

    insert(l, at, ...values) {
      return { '@@__assign__@@': l.splice(at, 0, ...values) };
    },

    remove(l, at, length) {
      return {
        '@@__assign__@@': l.splice(at, length),
        '@@__result__@@': l.slice(at, at + length)
      };
    },

    replace(l, at, length, ...values) {
      return {
        '@@__assign__@@': l.splice(at, length, ...values),
        '@@__result__@@': l.slice(at, at + length)
      };
    },

    join(l, delim) {
      return l.join(delim || ' ');
    },

    push(l, ...values) {
      return { '@@__assign__@@': l.push(...values) };
    },

    pop(l) {
      return { '@@__assign__@@': l.pop(), '@@__result__@@': l.last() };
    },

    reverse(l) {
      return { '@@__assign__@@': l.reverse() };
    },

    sort(l) {
      return {
        '@@__assign__@@': l.sort((left, right) => {
          let h = handle(left);
          return h.binaryops['<'](left, right) ? -1 : (h.binaryops['>'](left, right) ? 1 : 0);
        })
      };
    }
  },

  binaryops: extendObject(SContainer.binaryops, {
    '$': checkOp((left, right) => left.concat(right))
  })
});

Object.defineProperty(immutable.List.prototype, '@@__handler__@@', {
  value: SList,
  enumerable: false
});

// Maps (Tables, Hashes)

export const SMap = extendObject(SContainer, {
  create() {
    return immutable.Map();
  },

  repr(m) {
    let pairs = m.map((val, key) => handle(key).repr(key) + ': ' + handle(val).repr(val));
    return '[ ' + pairs.join(', ') + ' ]';
  },

  enumerate(m) {
    return SList.enumerate(m.keySeq());
  },

  methods: {
    len(m) {
      return m.size;
    },

    keys(m) {
      return immutable.List(m.keySeq());
    },

    range(m, ...keys) {
      return immutable.Map().withMutations((n) => {
        for (let i = 0; i < keys.length; ++i) {
          n.set(keys[i], m.get(keys[i]));
        }
      });
    },

    insert(m, ...pairs) {
      return {
        '@@__assign__@@': m.withMutations((n) => {
          for (let i = 0; i < pairs.length; i += 2) {
            n.set(pairs[i], pairs[i + 1]);
          }
        })
      };
    },

    remove(m, ...keys) {
      let o = m.asMutable();
      return {
        '@@__result__@@': immutable.Map().withMutations((n) => {
          for (let i = 0; i < keys.length; ++i) {
            n.set(keys[i], m.get(keys[i]));
            o.delete(keys[i]);
          }
        }),
        '@@__assign__@@': o.asImmutable()
      };
    }
  },

  binaryops: extendObject(SContainer.binaryops, {
    '$': checkOp((left, right) => left.merge(right))
  })
});

Object.defineProperty(immutable.Map.prototype, '@@__handler__@@', {
  value: SMap,
  enumerable: false
});

// find a protocol handler for this object
export function handle(obj) {
  // have to check for null/undefined explicitly
  if (obj == null) {
    return SNone;
  }

  // if protocol handler is a function call it with the object -- this allows
  // for duck type polymorphism on objects
  let handler = obj['@@__handler__@@']
  return typeof handler == 'function' ? handler(obj) : handler;
}

export const globals = {
  list(...dims) {
    return SList.create(dims);
  },

  map() {
    return SMap.create();
  },

  swap(a, b) {
    return {
      '@@__assign__@@': [ b, a ],
      '@@__result__@@': null
    };
  },

  print(...values) {
    if (values.length > 0) {
      for (let v of values) {
        console.log(handle(v).repr(v));
      }
    } else {
      console.log();
    }
  },

  sleep(seconds) {
    return new Promise((resolve) => {
      setTimeout(resolve, seconds * 1000);
    });
  }
};

export function createRuntime() {
  return new SRuntime();
}
