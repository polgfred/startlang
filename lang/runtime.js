'use strict';

import moment from 'moment';
import immutable from 'immutable';
import { extendObject } from './utils';

export class ScriptExit extends Error {}

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
    this.st = immutable.Stack();
    this.wst = immutable.Stack();
  }

  // push and pop new objects onto the ns stack
  push() {
    this.st = this.st.push(this.ns);
    this.ns = immutable.Map();
  }

  pop() {
    this.ns = this.st.first();
    this.st = this.st.pop();
  }

  // push and pop values onto the with stack
  pushw(val) {
    this.wst = this.wst.push(val);
  }

  popw() {
    this.wst = this.wst.pop();
  }

  get(name) {
    // look in the current ns
    let result = this.ns.get(name);
    if (typeof result != 'undefined') {
      return result;
    }

    // look up the stack (should we do this?)
    let iter = this.st.values();
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

  getfn(name) {
    return this.fn.get(name);
  }

  setfn(name, body) {
    this.fn = this.fn.set(name, body);
  }

  syscall(name, args, assn) {
    // this is pretty much the workhorse that glues the runtime API and the
    // interpreter together. it's long and kind of ugly, but it gets called
    // a lot, so it needs to be crazy fast.

    // first try to find the function to call
    let fn, wflag = false;
    if (!this.wst.isEmpty()) {
      let { rv: wrv, lv: wlv } = this.wst.first();
      // try to look up a method of the object on the with stack
      fn = handle(wrv).methods[name];
      if (fn) {
        // if we found one, prepend the with obj onto the arg list
        wflag = true;
        args.unshift(wrv);
        assn.unshift(wlv);
      }
    }
    if (!fn) {
      // try to look up a method of the first argument, or a global function
      fn = (args.length > 0 && handle(args[0]).methods[name]) ||
            this.globals[name];
    }
    if (!fn) {
      // couldn't find it
      throw new Error('object not found or not a function');
    }

    // make the call
    let res = fn.call(this, ...args);
    let repl, i, r, a;
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
            if (i == 0 && wflag) {
              // we're in with-mode, so set the top of the with stack
              // to the replaced value
              this.wst = this.wst.withMutations((m) => {
                m.pop();
                m.push({ rv: r, lv: a });
              });
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

SRuntime.prototype.globals = {
  exit() {
    throw new ScriptExit();
  },

  time(...args) {
    return STime.create(args);
  },

  list(...items) {
    return SList.create(items);
  },

  table(...pairs) {
    return STable.create(pairs);
  },

  num(value) {
    let result = parseFloat(value);
    if (result != result) {
      throw new Error('result is not a number');
    }
    return result;
  },

  rand() {
    return Math.random();
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

    rand(lo, hi) {
      return Math.floor(Math.random() * (hi - lo + 1)) + lo;
    },

    constrain(n, lo, hi) {
      return Math.min(Math.max(n, lo), hi);
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

function checkTimeUnit(unit) {
  if (moment.normalizeUnits(unit) == null) {
    throw new Error('unrecognized time unit');
  }
}

export const STime = extendObject(SBase, {
  create(args) {
    if (args.length == 0) {
      return moment();
    } else {
      args[1]--; // adjust the month to be 0-based
      return moment(args);
    }
  },

  repr(t) {
    return t.format('l LTS');
  },

  methods: {
    part(t, unit) {
      checkTimeUnit(unit);
      let val = t.get(unit);
      if (unit == 'month' || unit == 'day') {
        val++;
      }
      return val;
    },

    add(t, n, unit) {
      checkTimeUnit(unit);
      return { '@@__assign__@@': moment(t).add(n, unit) };
    },

    sub(t, n, unit) {
      checkTimeUnit(unit);
      return { '@@__assign__@@': moment(t).subtract(n, unit) };
    },

    startof(t, unit) {
      checkTimeUnit(unit);
      return { '@@__assign__@@': moment(t).startOf(unit) };
    },

    endof(t, unit) {
      checkTimeUnit(unit);
      return { '@@__assign__@@': moment(t).endOf(unit) };
    },

    diff(t1, t2, unit) {
      checkTimeUnit(unit);
      return t2.diff(t1, unit);
    }
  },

  binaryops: extendObject(SBase.binaryops, {
    // comparison operators need to cast to number first
    '=' : (left, right) => +left  == +right,
    '!=': (left, right) => +left !== +right
  })
});

moment.fn[handlerKey] = STime;

// Containers

function compareElements(left, right) {
  let h = handle(left);
  return h.binaryops['<'](left, right) ? -1 : (h.binaryops['>'](left, right) ? 1 : 0);
}

function compareElementsReversed(left, right) {
  let h = handle(left);
  return h.binaryops['<'](left, right) ? 1 : (h.binaryops['>'](left, right) ? -1 : 0);
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

    add(l, ...values) {
      return { '@@__assign__@@': l.push(...values) };
    },

    insert(l, start, ...values) {
      // adjust for 1-based indexes and negative offsets
      start = adjustIndex(start, l.size);
      return { '@@__assign__@@': l.splice(start, 0, ...values) };
    },

    remove(l, start, end) {
      // adjust for 1-based indexes and negative offsets
      start = adjustIndex(start, l.size);
      if (end == null) {
        // remove and return a single element
        return {
          '@@__result__@@': l.get(start),
          '@@__assign__@@': l.splice(start, 1)
        }
      } else {
        end = adjustIndex(end, l.size);
        // inclusive
        return {
          '@@__result__@@': l.slice(start, end + 1),
          '@@__assign__@@': l.splice(start, end - start + 1)
        };
      }
    },

    join(l, delim) {
      return l.join(delim || ' ');
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
    },

    rsort(l) {
      return {
        '@@__assign__@@': l.sort(compareElementsReversed)
      };
    },

    reverse(l) {
      return { '@@__assign__@@': l.reverse() };
    },

    shuffle(l) {
      return {
        '@@__assign__@@': immutable.List().withMutations((m) => {
          for (let i = 0; i < l.size; ++i) {
            let j = Math.floor(Math.random() * i);
            m.set(i, m.get(j));
            m.set(j, l.get(i));
          }
        })
      };
    }
  },

  binaryops: extendObject(SContainer.binaryops, {
    '$': checkOp((left, right) => left.concat(right))
  })
});

immutable.List.prototype[handlerKey] = SList;

// Tables

export const STable = extendObject(SContainer, {
  create(pairs) {
    return immutable.Map().withMutations((n) => {
      for (let i = 0; i < pairs.length; i += 2) {
        n.set(pairs[i], pairs[i + 1]);
      }
    });
  },

  repr(t) {
    let pairs = t.map((val, key) => handle(key).repr(key) + ': ' + handle(val).repr(val));
    return '[ ' + pairs.join(', ') + ' ]';
  },

  getindex(t, index) {
    return t.get(index);
  },

  setindex(t, index, value) {
    return t.set(index, value);
  },

  enumerate(t) {
    return SList.enumerate(t.keySeq());
  },

  methods: {
    len(t) {
      return t.size;
    },

    keys(t) {
      return immutable.List(t.keySeq());
    },

    put(t, ...pairs) {
      return {
        '@@__assign__@@': t.withMutations((n) => {
          for (let i = 0; i < pairs.length; i += 2) {
            n.set(pairs[i], pairs[i + 1]);
          }
        })
      };
    },

    remove(t, ...keys) {
      // remove and return one or more values
      let o = [];

      return {
        '@@__assign__@@':
          t.withMutations((n) => {
            for (let i = 0; i < keys.length; ++i) {
              o.push(t.get(keys[i]));
              n.delete(keys[i]);
            }
          }),
        '@@__result__@@':
          o.length == 1 ? o[0] : immutable.List(o)
      };
    }
  },

  binaryops: extendObject(SContainer.binaryops, {
    '$': checkOp((left, right) => left.merge(right))
  })
});

immutable.Map.prototype[handlerKey] = STable;

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

export function createRuntime() {
  return new SRuntime();
}
