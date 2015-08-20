import immutable from 'immutable';
import { extendObject } from './utils';

export let handlerKey = Symbol('START_HANDLER');

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

export function adjustIndex(index, size) {
  return index > 0 ? index - 1 : Math.max(0, size + index);
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

Boolean.prototype[handlerKey] = SBoolean;

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
    'floor',
    'round',
    'sin',
    'sqrt',
    'tan',
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
    log(n, base) {
      if (base == null) {
        return Math.log(n);
      } else if (base == 10) {
        return Math.log10(n);
      } else {
        return Math.log10(n) / Math.log10(base);
      }
    },

    exp(n, base) {
      if (base == null) {
        return Math.exp(n);
      } else {
        return Math.pow(base, n);
      }
    },

    random() {
      return Math.random();
    },

    randrange(low, high) {
      return Math.floor(Math.random() * (high - low + 1)) + low;
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
    // bitwise
    '&': checkMathOp((left, right) => left & right),
    '|': checkMathOp((left, right) => left | right),
    '^': checkMathOp((left, right) => left ^ right)
  })
});

Number.prototype[handlerKey] = SNumber;

// this type basically exists to implement for-loops lazily
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

  binaryops: {
    '=' : (left, right) =>  left.equals(right),
    '!=': (left, right) => !left.equals(right)
  }
});

immutable.Range.prototype[handlerKey] = SRange;

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
    return s.charAt(adjustIndex(index, s.length));
  },

  setindex(s, index, value) {
    index = adjustIndex(index, s.length);
    return s.substr(0, index) + value + s.substr(index + 1);
  },

  methods: {
    len(s) {
      return s.length;
    },

    first(s, search) {
      let pos = s.indexOf(search);
      return pos + 1;
    },

    last(s, search) {
      let pos = s.lastIndexOf(search);
      return pos + 1;
    },

    copy(s, start, end) {
      // adjust for 1-based indexes and negative offsets
      start = adjustIndex(start, s.length);
      end = adjustIndex(end, s.length);
      // inclusive
      return s.substring(start, end + 1);
    },

    replace(s, search, to) {
      return { '@@__assign__@@': s.replace(search, to) };
    },

    reverse(s) {
      return { '@@__assign__@@': s.split('').reverse().join('') };
    },

    split(s, delim) {
      return immutable.List(s.split(delim || ' '));
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

String.prototype[handlerKey] = SString;

// Containers

function compareElements(left, right) {
  let h = handle(left);
  return h.binaryops['<'](left, right) ? -1 : (h.binaryops['>'](left, right) ? 1 : 0);
}

export const SContainer = extendObject(SBase, {
  binaryops: {
    '=' : (left, right) =>  left.equals(right),
    '!=': (left, right) => !left.equals(right)
  }
});

// Lists

export const SList = extendObject(SContainer, {
  create(items) {
    return immutable.List(items);
  },

  repr(l) {
    return '[ ' + l.map((el) => handle(el).repr(el)).join(', ') + ' ]';
  },

  getindex(l, index) {
    return l.get(adjustIndex(index, l.size));
  },

  setindex(l, index, value) {
    return l.set(adjustIndex(index, l.size), value);
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

    first(l, search) {
      let pos = l.indexOf(search);
      return pos + 1;
    },

    last(l, search) {
      let pos = l.lastIndexOf(search);
      return pos + 1;
    },

    copy(l, start, end) {
      // adjust for 1-based indexes and negative offsets
      start = adjustIndex(start, l.size);
      end = adjustIndex(end, l.size);
      // inclusive
      return l.slice(start, end + 1);
    },

    insert(l, start, ...values) {
      // adjust for 1-based indexes and negative offsets
      start = adjustIndex(start, s.size);
      return { '@@__assign__@@': l.splice(start, 0, ...values) };
    },

    remove(l, start, end) {
      // adjust for 1-based indexes and negative offsets
      start = adjustIndex(start, s.size);
      end = adjustIndex(end, s.size);
      // inclusive
      return {
        '@@__assign__@@': l.splice(start, end - start + 1),
        '@@__result__@@': l.slice(start, end + 1)
      };
    },

    join(l, delim) {
      return l.join(delim || ' ');
    },

    reverse(l) {
      return { '@@__assign__@@': l.reverse() };
    },

    sum(l) {
      return l.reduce((total, item) => {
        if (handle(item) != SNumber) {
          throw new Error('list must contain only numbers');
        }
        return total + item;
      }, 0);
    },

    min(l) {
      return l.min(compareElements);
    },

    max(l) {
      return l.max(compareElements);
    },

    avg(l) {
      return SList.methods.sum(l) / l.size;
    },

    sort(l) {
      return {
        '@@__assign__@@': l.sort(compareElements)
      };
    }
  },

  binaryops: extendObject(SContainer.binaryops, {
    '$': checkOp((left, right) => left.concat(right))
  })
});

immutable.List.prototype[handlerKey] = SList;

// Maps (Tables, Hashes)

export const SMap = extendObject(SContainer, {
  create(pairs) {
    return immutable.Map().withMutations((n) => {
      for (let i = 0; i < pairs.length; i += 2) {
        n.set(pairs[i], pairs[i + 1]);
      }
    });
  },

  repr(m) {
    let pairs = m.map((val, key) => handle(key).repr(key) + ': ' + handle(val).repr(val));
    return '[ ' + pairs.join(', ') + ' ]';
  },

  getindex(m, index) {
    return m.get(index);
  },

  setindex(m, index, value) {
    return m.set(index, value);
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

    put(m, ...pairs) {
      return {
        '@@__assign__@@': m.withMutations((n) => {
          for (let i = 0; i < pairs.length; i += 2) {
            n.set(pairs[i], pairs[i + 1]);
          }
        })
      };
    },

    delete(m, ...keys) {
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

immutable.Map.prototype[handlerKey] = SMap;

// find a protocol handler for this object
export function handle(obj) {
  // have to check for null/undefined explicitly
  if (obj == null) {
    return SNone;
  }

  // if protocol handler is a function call it with the object -- this allows
  // for duck type polymorphism on objects
  let handler = obj[handlerKey];
  return typeof handler == 'function' ? handler(obj) : handler;
}

export const globals = {
  list(...items) {
    return SList.create(items);
  },

  map(...pairs) {
    return SMap.create(pairs);
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
