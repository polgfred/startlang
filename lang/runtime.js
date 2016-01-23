'use strict';

import readline from 'readline';
import moment from 'moment';
import immutable from 'immutable';

export const handlerKey = Symbol('START_HANDLER');

// ensures its operands are of the same type
function checkOp(fn) {
  return (left, right) => {
    if (handle(left) !== handle(right)) {
      throw new Error('operands must be of the same type');
    }
    // forward onto the original
    return fn(left, right);
  };
}

// the above, plus ensures that its return value is not NaN
function checkMathOp(fn) {
  let checked = checkOp(fn);

  return (left, right) => {
    let result = checked(left, right);
    // check for numeric (not NaN) result
    if (result !== result) {
      throw new Error('result is not a number');
    }
    return result;
  };
}

function adjustIndex(index, size) {
  return index > 0 ? index - 1 : Math.max(0, size + index);
}

// for runtime API functions to indicate that their result may be assigned
// back to lvalued arguments
export const assignKey = Symbol('START_ASSIGN');
export const resultKey = Symbol('START_RESULT');

// Environment

export class SRuntime {
  handle(value) {
    return handle(value);
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

  syscall(name, args) {
    // try to find the function to call
    let fn = (args.length > 0 && handle(args[0]).methods[name]) ||
              this.constructor.globals[name];
    if (!fn) {
      throw new Error('object not found or not a function');
    }

    // make the call
    return fn.call(this, ...args);
  }
}

SRuntime.globals = {
  // types/casts

  num(value) {
    let n = parseFloat(value);
    if (n != n) {
      throw new Error('cannot convert value to a number');
    }
    return n;
  },

  str(value) {
    return handle(value).repr(value);
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

  // some basic utilities

  rand() {
    return Math.random();
  },

  swap(a, b) {
    return {
      [assignKey]: [ b, a ],
      [resultKey]: null
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

  input(message) {
    return new Promise((resolve) => {
      let rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
      });

      rl.question(message, (answer) => {
        rl.close();
        resolve(answer);
      });
    });
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

  methods: {},

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

export const SNone = Object.setPrototypeOf({
  repr() {
    return '*none*';
  }
}, SBase);

export const SBoolean = Object.setPrototypeOf({
  repr(b) {
    return b ? '*true*' : '*false*';
  }
}, SBase);

Boolean.prototype[handlerKey] = SBoolean;

export const SNumber = Object.setPrototypeOf({
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
    ns[method] = (...args) => {
      // forward onto built-in Math function
      var result = Math[method](...args);
      // check for numeric (not NaN) result
      if (result !== result) {
        throw new Error('result is not a number');
      }
      return result;
    };
    return ns;
  }, {
    log(base, n) {
      if (n == null) {
        n = base;
        return Math.log(n);
      } else if (base == 10) {
        return Math.log10(n);
      } else {
        return Math.log10(n) / Math.log10(base);
      }
    },

    exp(base, n) {
      if (n == null) {
        n = base;
        return Math.exp(n);
      } else {
        return Math.pow(base, n);
      }
    },

    rand(lo, hi) {
      return Math.floor(Math.random() * (hi - lo + 1)) + lo;
    },

    clamp(n, lo, hi) {
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

  binaryops: Object.setPrototypeOf({
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
  }, SBase.binaryops)
}, SBase);

Number.prototype[handlerKey] = SNumber;

export const SString = Object.setPrototypeOf({
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
      return { [assignKey]: s.replace(search, to) };
    },

    reverse(s) {
      return { [assignKey]: s.split('').reverse().join('') };
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

  binaryops: Object.setPrototypeOf({
    '$': (left, right) => left + handle(right).repr(right)
  }, SBase.binaryops)
}, SBase);

String.prototype[handlerKey] = SString;

function normalizeTimeUnit(unit) {
  let norm = moment.normalizeUnits(unit);
  if (norm == null) {
    throw new Error('unrecognized time unit');
  }
  return norm;
}

export const STime = Object.setPrototypeOf({
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
      unit = normalizeTimeUnit(unit);
      let val = t.get(unit);
      if (unit == 'month' || unit == 'day') {
        val++;
      }
      return val;
    },

    add(t, n, unit) {
      return { [assignKey]: moment(t).add(n, normalizeTimeUnit(unit)) };
    },

    sub(t, n, unit) {
      return { [assignKey]: moment(t).subtract(n, normalizeTimeUnit(unit)) };
    },

    startof(t, unit) {
      return { [assignKey]: moment(t).startOf(normalizeTimeUnit(unit)) };
    },

    endof(t, unit) {
      return { [assignKey]: moment(t).endOf(normalizeTimeUnit(unit)) };
    },

    diff(t1, t2, unit) {
      return t2.diff(t1, normalizeTimeUnit(unit));
    }
  },

  binaryops: Object.setPrototypeOf({
    // comparison operators need to cast to number first
    '=' : (left, right) => +left  == +right,
    '!=': (left, right) => +left !== +right
  }, SBase.binaryops)
}, SBase);

moment.fn[handlerKey] = STime;

// Containers

function compareElements(left, right) {
  let h = handle(left);
  return h.binaryops['<'](left, right) ? -1 : (h.binaryops['>'](left, right) ? 1 : 0);
}

function compareElementsReversed(left, right) {
  return -compareElements(left, right);
}

export const SContainer = Object.setPrototypeOf({
  binaryops: {
    '=' : (left, right) =>  left.equals(right),
    '!=': (left, right) => !left.equals(right)
  }
}, SBase);

// Lists

export const SList = Object.setPrototypeOf({
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
      return { [assignKey]: l.push(...values) };
    },

    insert(l, start, ...values) {
      // adjust for 1-based indexes and negative offsets
      start = adjustIndex(start, l.size);
      return { [assignKey]: l.splice(start, 0, ...values) };
    },

    remove(l, start, end) {
      // adjust for 1-based indexes and negative offsets
      start = adjustIndex(start, l.size);
      if (end == null) {
        // remove and return a single element
        return {
          [resultKey]: l.get(start),
          [assignKey]: l.splice(start, 1)
        }
      } else {
        end = adjustIndex(end, l.size);
        // inclusive
        return {
          [resultKey]: l.slice(start, end + 1),
          [assignKey]: l.splice(start, end - start + 1)
        };
      }
    },

    join(l, delim) {
      return l.join(delim || ' ');
    },

    sum(l) {
      return l.reduce((total, item) => handle(total).binaryops['+'](total, item));
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
      return { [assignKey]: l.sort(compareElements) };
    },

    rsort(l) {
      return { [assignKey]: l.sort(compareElementsReversed) };
    },

    reverse(l) {
      return { [assignKey]: l.reverse() };
    },

    shuffle(l) {
      return {
        [assignKey]: immutable.List().withMutations((m) => {
          for (let i = 0; i < l.size; ++i) {
            let j = Math.floor(Math.random() * i);
            m.set(i, m.get(j));
            m.set(j, l.get(i));
          }
        })
      };
    }
  },

  binaryops: Object.setPrototypeOf({
    '$': checkOp((left, right) => left.concat(right))
  }, SContainer.binaryops)
}, SContainer);

immutable.List.prototype[handlerKey] = SList;

// Tables

export const STable = Object.setPrototypeOf({
  create(pairs) {
    return immutable.OrderedMap().withMutations((n) => {
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
        [assignKey]: t.withMutations((n) => {
          for (let i = 0; i < pairs.length; i += 2) {
            n.set(pairs[i], pairs[i + 1]);
          }
        })
      };
    },

    remove(t, ...keys) {
      // remove and return one or more values
      let o = immutable.List().asMutable();

      return {
        [assignKey]:
          t.withMutations((n) => {
            for (let i = 0; i < keys.length; ++i) {
              o.push(t.get(keys[i]));
              n.delete(keys[i]);
            }
          }),
        [resultKey]:
          o.size == 1 ? o.first() : o.asImmutable()
      };
    }
  },

  binaryops: Object.setPrototypeOf({
    '$': checkOp((left, right) => left.merge(right))
  }, SContainer.binaryops)
}, SContainer);

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
  return new SRuntime;
}
