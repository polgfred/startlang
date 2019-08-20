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

export function makeRuntime(app) {
  const globals = {
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
      return timeHandler.create(args);
    },

    list(...items) {
      return listHandler.create(items);
    },

    table(...pairs) {
      return tableHandler.create(pairs);
    },

    // some basic utilities

    rand() {
      return Math.random();
    },

    swap(a, b) {
      return {
        [assignKey]: [b, a],
        [resultKey]: null,
      };
    },

    print(...values) {
      if (values.length > 0) {
        for (let i = 0; i < values.length; ++i) {
          let v = values[i];
          app.output(handle(v).repr(v));
        }
      } else {
        app.output();
      }
    },

    input(message) {
      return app.input(message);
    },

    sleep(seconds) {
      return new Promise(resolve => {
        setTimeout(resolve, seconds * 1000);
      });
    },

    snapshot() {
      app.snapshot();
    },
  };

  return {
    get globals() {
      return globals;
    },

    handle(value) {
      return handle(value);
    },

    enumerate(value) {
      return handle(value).enumerate(value);
    },

    unaryop(op, right) {
      return handle(right).unaryops[op](right);
    },

    binaryop(op, left, right) {
      return handle(left).binaryops[op](left, right);
    },

    syscall(name, args) {
      // try to find the function to call
      let fn =
        (args.length > 0 && handle(args[0]).methods[name]) ||
        this.globals[name];
      if (!fn) {
        throw new Error(`object not found or not a function: ${name}`);
      }

      // make the call
      return fn.call(this, ...args);
    },
  };
}

// Handler defaults

const baseHandler = {
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
    '=': (left, right) => left === right,
    '!=': (left, right) => left !== right,

    '<': checkOp((left, right) => left < right),
    '<=': checkOp((left, right) => left <= right),
    '>': checkOp((left, right) => left > right),
    '>=': checkOp((left, right) => left >= right),
  },
};

// Handler definitions

const noneHandler = {
  ...baseHandler,

  repr() {
    return '*none*';
  },
};

const booleanHandler = {
  ...baseHandler,

  repr(b) {
    return b ? '*true*' : '*false*';
  },
};

Boolean.prototype[handlerKey] = booleanHandler;

const numberHandler = {
  ...baseHandler,

  repr(n) {
    if (isFinite(n)) {
      return String(n);
    } else {
      return n > 0 ? '*infinity*' : '-*infinity*';
    }
  },

  methods: {
    abs(n) {
      return Math.abs(n);
    },

    acos(n) {
      return (Math.acos(n) * 180) / Math.PI;
    },

    asin(n) {
      return (Math.asin(n) * 180) / Math.PI;
    },

    atan(n) {
      return (Math.atan(n) * 180) / Math.PI;
    },

    cbrt(n) {
      return Math.cbrt(n);
    },

    ceil(n) {
      return Math.ceil(n);
    },

    clamp(n, lo, hi) {
      return Math.min(Math.max(n, lo), hi);
    },

    cos(n) {
      return Math.cos((n * Math.PI) / 180);
    },

    exp(base, n) {
      if (n == null) {
        n = base;
        return Math.exp(n);
      } else {
        return Math.pow(base, n);
      }
    },

    floor(n) {
      return Math.floor(n);
    },

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

    rand(lo, hi) {
      return Math.floor(Math.random() * (hi - lo + 1)) + lo;
    },

    round(n) {
      return Math.round(n);
    },

    sign(n) {
      return Math.sign(n);
    },

    sin(n) {
      return Math.sin((n * Math.PI) / 180);
    },

    sqrt(n) {
      return Math.sqrt(n);
    },

    tan(n) {
      return Math.tan((n * Math.PI) / 180);
    },

    max(...args) {
      return Math.max(...args);
    },

    min(...args) {
      return Math.min(...args);
    },
  },

  unaryops: {
    // math
    '+': right => +right,
    '-': right => -right,
    // bitwise
    '~': right => ~right,
  },

  binaryops: {
    ...baseHandler.binaryops,

    // math
    '+': checkMathOp((left, right) => left + right),
    '-': checkMathOp((left, right) => left - right),
    '*': checkMathOp((left, right) => left * right),
    '/': checkMathOp((left, right) => left / right),
    '%': checkMathOp((left, right) => left % right),
    // bitwise
    '&': checkMathOp((left, right) => left & right),
    '|': checkMathOp((left, right) => left | right),
    '^': checkMathOp((left, right) => left ^ right),
  },
};

Number.prototype[handlerKey] = numberHandler;

const stringHandler = {
  ...baseHandler,

  repr(s) {
    return s;
  },

  enumerate(s, index = 0) {
    return {
      value: s.charAt(index),
      more: index < s.length,
      next: () => stringHandler.enumerate(s, index + 1),
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
      return {
        [assignKey]: s
          .split('')
          .reverse()
          .join(''),
      };
    },

    split(s, delim) {
      return immutable.List(s.split(delim || ' '));
    },

    upper(s) {
      return s.toUpperCase();
    },

    lower(s) {
      return s.toLowerCase();
    },
  },

  binaryops: {
    ...baseHandler.binaryops,

    $: (left, right) => left + handle(right).repr(right),
  },
};

String.prototype[handlerKey] = stringHandler;

function normalizeTimeUnit(unit) {
  let norm = moment.normalizeUnits(unit);
  if (norm == null) {
    throw new Error('unrecognized time unit');
  }
  return norm;
}

const timeHandler = {
  ...baseHandler,

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
    },
  },

  binaryops: {
    ...baseHandler.binaryops,

    // comparison operators need to cast to number first
    '=': (left, right) => +left == +right,
    '!=': (left, right) => +left !== +right,
  },
};

moment.fn[handlerKey] = timeHandler;

// Containers

function compareElements(left, right) {
  let h = handle(left);
  return h.binaryops['<'](left, right)
    ? -1
    : h.binaryops['>'](left, right)
    ? 1
    : 0;
}

function compareElementsReversed(left, right) {
  return -compareElements(left, right);
}

const containerHandler = {
  ...baseHandler,

  binaryops: {
    '=': (left, right) => left.equals(right),
    '!=': (left, right) => !left.equals(right),
  },
};

// Lists

const listHandler = {
  ...containerHandler,

  create(items) {
    return immutable.List(items);
  },

  repr(l) {
    return '[ ' + l.map(el => handle(el).repr(el)).join(', ') + ' ]';
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
      next: () => listHandler.enumerate(l, index + 1),
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
          [assignKey]: l.splice(start, 1),
        };
      } else {
        end = adjustIndex(end, l.size);
        // inclusive
        return {
          [resultKey]: l.slice(start, end + 1),
          [assignKey]: l.splice(start, end - start + 1),
        };
      }
    },

    join(l, delim) {
      return l.join(delim || ' ');
    },

    sum(l) {
      return l.reduce((total, item) =>
        handle(total).binaryops['+'](total, item)
      );
    },

    min(l) {
      return l.min(compareElements);
    },

    max(l) {
      return l.max(compareElements);
    },

    avg(l) {
      return listHandler.methods.sum(l) / l.size;
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
        [assignKey]: immutable.List().withMutations(m => {
          for (let i = 0; i < l.size; ++i) {
            let j = Math.floor(Math.random() * i);
            m.set(i, m.get(j));
            m.set(j, l.get(i));
          }
        }),
      };
    },
  },

  binaryops: {
    ...containerHandler.binaryops,

    $: checkOp((left, right) => left.concat(right)),
  },
};

immutable.List.prototype[handlerKey] = listHandler;

// Tables

const tableHandler = {
  ...containerHandler,

  create(pairs) {
    return immutable.OrderedMap().withMutations(n => {
      for (let i = 0; i < pairs.length; i += 2) {
        n.set(pairs[i], pairs[i + 1]);
      }
    });
  },

  repr(t) {
    let pairs = t.map(
      (val, key) => handle(key).repr(key) + ': ' + handle(val).repr(val)
    );
    return '[ ' + pairs.join(', ') + ' ]';
  },

  getindex(t, index) {
    return t.get(index);
  },

  setindex(t, index, value) {
    return t.set(index, value);
  },

  enumerate(t) {
    return listHandler.enumerate(t.keySeq());
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
        [assignKey]: t.withMutations(n => {
          for (let i = 0; i < pairs.length; i += 2) {
            n.set(pairs[i], pairs[i + 1]);
          }
        }),
      };
    },

    remove(t, ...keys) {
      // remove and return one or more values
      let o = immutable.List().asMutable();

      return {
        [assignKey]: t.withMutations(n => {
          for (let i = 0; i < keys.length; ++i) {
            o.push(t.get(keys[i]));
            n.delete(keys[i]);
          }
        }),
        [resultKey]: o.size == 1 ? o.first() : o.asImmutable(),
      };
    },
  },

  binaryops: {
    ...containerHandler.binaryops,

    $: checkOp((left, right) => left.merge(right)),
  },
};

immutable.OrderedMap.prototype[handlerKey] = tableHandler;

// find a protocol handler for this object
function handle(obj) {
  // have to check for null/undefined explicitly
  if (obj == null) {
    return noneHandler;
  }

  // if protocol handler is a function call it with the object -- this allows
  // for duck type polymorphism on objects
  let handler = obj[handlerKey];
  return typeof handler == 'function' ? handler(obj) : handler;
}
