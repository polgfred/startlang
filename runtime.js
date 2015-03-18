import util from 'util';
import immutable from 'immutable';
import { extendObject, checkArgumentTypes } from './utils';

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
    var result = this.ns.get(name);
    if (typeof result != 'undefined') {
      return result;
    }

    // look up the stack (should we do this?)
    var iter = this.stack.values(), next;
    while (true) {
      next = iter.next();
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

  del(name) {
    // always in the current ns only
    this.ns = this.ns.delete(name);
  }

  getindex(name, indexes) {
    var max = indexes.length - 1;
    return next(this.get(name), 0);

    function next(b, i) {
      var h = handle(b), idx = indexes[i];
      return (i == max) ?
                h.getindex(b, idx) :
                next(h.getindex(b, idx), i + 1);
    }
  }

  setindex(name, indexes, value) {
    var max = indexes.length - 1;
    this.set(name, next(this.get(name), 0));

    function next(b, i) {
      var h = handle(b), idx = indexes[i];
      return (i == max) ?
                h.setindex(b, idx, value) :
                h.setindex(b, idx, next(h.getindex(b, idx), i + 1));
    }
  }

  delindex(name, indexes) {
    var max = indexes.length - 1;
    this.set(name, next(this.get(name), 0));

    function next(b, i) {
      var h = handle(b), idx = indexes[i];
      return (i == max) ?
                h.delindex(b, idx) :
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

  getfn(name) {
    return this.fn.get(name);
  }

  setfn(name, body) {
    this.fn = this.fn.set(name, body);
  }

  syscall(name, args, assn) {
    // look for a function by first argument, or in global map
    var fn = (args.length > 0 && handle(args[0]).methods[name]) || globals[name];
    if (!fn) {
      throw new Error('object not found or not a function');
    }

    // call a runtime function
    var res = fn.apply(null, args), repl, i, a, r;
    if (res) {
      repl = res['@@__assign__@@'];
      if (repl) {
        // if this result contains replacement args, assign them
        if (!Array.isArray(repl)) {
          repl = [ repl ];
        }
        // loop over replacement args
        for (i = 0; i < repl.length; ++i) {
          r = repl[i];
          if (typeof r != 'undefined') {
            // we have a replacement for this slot
            a = assn[i];
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

export var SBase = {
  enumerate() {
    throw new Error('object does not support iteration');
  },

  getindex() {
    throw new Error('object does not support []');
  },

  setindex() {
    throw new Error('object does not support []');
  },

  delindex() {
    throw new Error('object does not support []');
  },

  methods: [],

  unaryops: {},

  binaryops: {
    // standard comparison operators
    '=' : (left, right) => left == right,
    '!=': (left, right) => left != right,

    '<' : checkArgumentTypes((left, right) => left <  right),
    '<=': checkArgumentTypes((left, right) => left <= right),
    '>' : checkArgumentTypes((left, right) => left >  right),
    '>=': checkArgumentTypes((left, right) => left >= right)
  }
};

// Handler definitions

export var SNone = extendObject(SBase, {
  repr() {
    return '*none*';
  }
});

export var SBoolean = extendObject(SBase, {
  repr(b) {
    return b ? '*true*' : '*false*';
  }
});

Object.defineProperty(Boolean.prototype, '@@__handler__@@', {
  value: SBoolean,
  enumerable: false
});

export var SNumber = extendObject(SBase, {
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
    ns[method] = Math[method];
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
    '+': (right) => +right,
    '-': (right) => -right
  },

  binaryops: extendObject(SBase.binaryops, {
    // math
    '+': checkArgumentTypes((left, right) => left + right),
    '-': checkArgumentTypes((left, right) => left - right),
    '*': checkArgumentTypes((left, right) => left * right),
    '/': checkArgumentTypes((left, right) => left / right),
    '%': checkArgumentTypes((left, right) => left % right),
    '^': checkArgumentTypes((left, right) => Math.pow(left, right))
  })
});

Object.defineProperty(Number.prototype, '@@__handler__@@', {
  value: SNumber,
  enumerable: false
});

export var SRange = extendObject(SBase, {
  repr(r) {
    return `[ ${r._start} .. ${r._end} / ${r._step} ]`;
  },

  enumerate(r, current) {
    if (typeof current == 'undefined') {
      current = r._start;
    }

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

export var SString = extendObject(SBase, {
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

  delindex(s, index) {
    return s.substr(0, index) + s.substr(index + 1);
  },

  methods: {
    len(s) {
      return s.length;
    },

    find(s, search) {
      var pos = s.indexOf(search);
      return pos >= 0 ? pos : null;
    },

    findlast(s, search) {
      var pos = s.lastIndexOf(search);
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
        '@@__assign__@@':
          s.substr(0, at) + s.substr(at + length),
        '@@__result__@@':
          s.substr(at, length)
      };
    },

    replace(s, at, length, more) {
      return {
        '@@__assign__@@':
          s.substr(0, at) + more + s.substr(at + length),
        '@@__result__@@':
          s.substr(at, length)
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
    '&': (left, right) => left + handle(right).repr(right)
  })
});

Object.defineProperty(String.prototype, '@@__handler__@@', {
  value: SString,
  enumerable: false
});

// Containers

export var SContainer = extendObject(SBase, {
  getindex(c, index) {
    return c.get(index);
  },

  setindex(c, index, value) {
    return c.set(index, value);
  },

  delindex(c, index) {
    return c.delete(index);
  },

  binaryops: {
    '=' : (left, right) =>  left.equals(right),
    '!=': (left, right) => !left.equals(right)
  }
});

// Lists

export var SList = extendObject(SContainer, {
  create(dims = [0]) {
    var buildSubArray = (dims) => {
      var next = dims.slice(1);
      return immutable.List().withMutations((sub) => {
        for (var i = 0; i < dims[0]; ++i) {
          sub.set(i, dims.length > 1 ? buildSubArray(next) : null);
        }
      });
    }
    return buildSubArray(dims);
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
      var pos = l.indexOf(search);
      return pos >= 0 ? pos : null;
    },

    findlast(l, search) {
      var pos = l.lastIndexOf(search);
      return pos >= 0 ? pos : null;
    },

    range(l, at, length) {
      return l.slice(at, at + length);
    },

    insert(l, at, ...values) {
      return {
        '@@__assign__@@':
          l.splice(at, 0, ...values)
      };
    },

    remove(l, at, length) {
      return {
        '@@__assign__@@':
          l.splice(at, length),
        '@@__result__@@':
          l.slice(at, at + length)
      };
    },

    replace(l, at, length, ...values) {
      return {
        '@@__assign__@@':
          l.splice(at, length, ...values),
        '@@__result__@@':
          l.slice(at, at + length)
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
        '@@__assign__@@':
          l.sort((left, right) => {
            var h = handle(left);
            return h.binaryops['<'](left, right) ? -1 : (h.binaryops['>'](left, right) ? 1 : 0);
          })
      };
    }
  },

  binaryops: extendObject(SContainer.binaryops, {
    '&': checkArgumentTypes((left, right) => left.concat(right))
  })
});

Object.defineProperty(immutable.List.prototype, '@@__handler__@@', {
  value: SList,
  enumerable: false
});

// Maps (Tables, Hashes)

export var SMap = extendObject(SContainer, {
  create() {
    return immutable.Map();
  },

  repr(m) {
    return '[ '
      + m.map((val, key) => handle(key).repr(key) + ': '
                            + handle(val).repr(val)).join(', ')
      + ' ]';
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

    clear(m) {
      return { '@@__assign__@@': m.clear() };
    },

    range(m, ...keys) {
      return immutable.Map().withMutations((n) => {
        for (var i = 0; i < keys.length; ++i) {
          n.set(keys[i], m.get(keys[i]));
        }
      });
    },

    insert(m, ...pairs) {
      return {
        '@@__assign__@@':
          m.withMutations((n) => {
            for (var i = 0; i < pairs.length; i += 2) {
              n.set(pairs[i], pairs[i + 1]);
            }
          }),
      };
    },

    remove(m, ...keys) {
      var o = m.asMutable();

      return {
        '@@__result__@@':
          immutable.Map().withMutations((n) => {
            for (var i = 0; i < keys.length; ++i) {
              n.set(keys[i], m.get(keys[i]));
              o.delete(keys[i]);
            }
          }),
        '@@__assign__@@':
          o.asImmutable()
      };
    }
  },

  binaryops: extendObject(SContainer.binaryops, {
    '&': checkArgumentTypes((left, right) => left.merge(right))
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
  var handler = obj['@@__handler__@@']
  return typeof handler == 'function' ? handler(obj) : handler;
}

export var globals = {
  list(...dims) {
    return SList.create(dims);
  },

  map() {
    return SMap.create();
  },

  swap(a, b) {
    return {
      '@@__assign__@@':
        [ b, a ],
      '@@__result__@@':
        null
    };
  },

  print(...values) {
    if (values.length > 0) {
      values.forEach((value) => {
        console.log(handle(value).repr(value));
      });
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

globals.array = globals.list;
globals.table = globals.map;

export function create() {
  return new SRuntime();
}
