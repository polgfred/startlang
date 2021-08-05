/* eslint-disable no-fallthrough */

import deepEqual from 'deep-equal';
import { produce } from 'immer';

import { handle, assignKey, resultKey } from './interpreter';

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
  const checked = checkOp(fn);

  return (left, right) => {
    const result = checked(left, right);
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

// built-ins

export const builtinGlobals = {
  // types/casts

  num(value) {
    const n = parseFloat(value);
    if (n !== n) {
      throw new Error('cannot convert value to a number');
    }
    return n;
  },

  str(value) {
    return handle(value).repr(value);
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

  sleep(seconds) {
    return new Promise((resolve) => {
      setTimeout(resolve, seconds * 1000);
    });
  },
};

// Handler defaults

export const baseHandler = {
  enumerate() {
    throw new Error('object does not support iteration');
  },

  getindex() {
    throw new Error('object does not support []');
  },

  setindex() {
    throw new Error('object does not support []');
  },

  globals: {},

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

export const noneHandler = {
  ...baseHandler,

  repr() {
    return '*none*';
  },
};

export const booleanHandler = {
  ...baseHandler,

  repr(b) {
    return b ? '*true*' : '*false*';
  },
};

export const numberHandler = {
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
      if (n === undefined) {
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
      if (n === undefined) {
        n = base;
        return Math.log(n);
      } else if (base === 10) {
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
    '+': (right) => +right,
    '-': (right) => -right,
    // bitwise
    '~': (right) => ~right,
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

export const stringHandler = {
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
      const pos = s.indexOf(search);
      return pos + 1;
    },

    last(s, search) {
      const pos = s.lastIndexOf(search);
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
      return { [assignKey]: [s.replace(search, to)] };
    },

    reverse(s) {
      return {
        [assignKey]: [s.split('').reverse().join('')],
      };
    },

    split(s, delim) {
      return s.split(delim || ' ');
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

// Containers

function compareElements(left, right) {
  const h = handle(left);
  return h.binaryops['<'](left, right)
    ? -1
    : h.binaryops['>'](left, right)
    ? 1
    : 0;
}

function compareElementsReversed(left, right) {
  return -compareElements(left, right);
}

export const containerHandler = {
  ...baseHandler,

  binaryops: {
    '=': (left, right) => deepEqual(left, right),
    '!=': (left, right) => !deepEqual(left, right),
  },
};

// Lists

export const listHandler = {
  ...containerHandler,

  repr(l) {
    return '[ ' + l.map((el) => handle(el).repr(el)).join(', ') + ' ]';
  },

  getindex(l, index) {
    index = adjustIndex(index, l.length);
    return l[index];
  },

  setindex(l, index, value) {
    index = adjustIndex(index, l.length);
    return produce(l, (dl) => {
      dl[index] = value;
    });
  },

  enumerate(l, index = 0) {
    return {
      value: l[index],
      more: index < l.length,
      next: () => listHandler.enumerate(l, index + 1),
    };
  },

  globals: {
    list(...items) {
      return produce([], (dl) => {
        dl.push(...items);
      });
    },
  },

  methods: {
    len(l) {
      return l.length;
    },

    first(l, search) {
      const pos = l.indexOf(search);
      return pos + 1;
    },

    last(l, search) {
      const pos = l.lastIndexOf(search);
      return pos + 1;
    },

    copy(l, start, end) {
      // adjust for 1-based indexes and negative offsets
      start = adjustIndex(start, l.length);
      end = adjustIndex(end, l.length);
      // inclusive
      return l.slice(start, end + 1);
    },

    add(l, ...values) {
      return {
        [assignKey]: [
          produce(l, (dl) => {
            dl.push(...values);
          }),
        ],
      };
    },

    insert(l, start, ...values) {
      // adjust for 1-based indexes and negative offsets
      start = adjustIndex(start, l.length);
      return {
        [assignKey]: [
          produce(l, (dl) => {
            dl.splice(start, 0, ...values);
          }),
        ],
      };
    },

    remove(l, start, end) {
      // adjust for 1-based indexes and negative offsets
      start = adjustIndex(start, l.length);
      // get the removed items and the new list
      let removed;
      const nl = produce(l, (dl) => {
        removed =
          end === undefined
            ? // remove and return a single element
              dl.splice(start, 1)[0]
            : // remove a range
              dl.splice(start, end - start + 1);
      });
      return {
        [resultKey]: removed,
        [assignKey]: [nl],
      };
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
      return l.reduce((least, item) =>
        handle(item).binaryops['<'](item, least) ? item : least
      );
    },

    max(l) {
      return l.reduce((least, item) =>
        handle(item).binaryops['>'](item, least) ? item : least
      );
    },

    avg(l) {
      return listHandler.methods.sum(l) / l.length;
    },

    sort(l) {
      return {
        [assignKey]: [
          produce(l, (dl) => {
            dl.sort(compareElements);
          }),
        ],
      };
    },

    rsort(l) {
      return {
        [assignKey]: [
          produce(l, (dl) => {
            dl.sort(compareElementsReversed);
          }),
        ],
      };
    },

    reverse(l) {
      return {
        [assignKey]: [
          produce(l, (dl) => {
            dl.reverse();
          }),
        ],
      };
    },

    shuffle(l) {
      return {
        [assignKey]: [
          produce(l, (dl) => {
            for (let i = 0; i < l.length; ++i) {
              const j = Math.floor(Math.random() * i);
              dl[i] = l[j];
              dl[j] = l[i];
            }
          }),
        ],
      };
    },
  },

  binaryops: {
    ...containerHandler.binaryops,

    $: checkOp((left, right) => left.concat(right)),
  },
};

// Tables

export const tableHandler = {
  ...containerHandler,

  repr(t) {
    const pairs = Object.keys(t).map((key) => {
      const val = t[key];
      return handle(key).repr(key) + ': ' + handle(val).repr(val);
    });
    return '[ ' + pairs.join(', ') + ' ]';
  },

  getindex(t, index) {
    return t[index];
  },

  setindex(t, index, value) {
    return produce(t, (dt) => {
      dt[index] = value;
    });
  },

  enumerate(t) {
    return listHandler.enumerate(Object.keys(t));
  },

  globals: {
    table(...pairs) {
      return produce({}, (dt) => {
        for (let i = 0; i < pairs.length; i += 2) {
          dt[pairs[i]] = pairs[i + 1];
        }
      });
    },
  },

  methods: {
    len(t) {
      return Object.keys(t).length;
    },

    keys(t) {
      return Object.keys(t);
    },

    put(t, ...pairs) {
      return {
        [assignKey]: [
          produce(t, (dt) => {
            for (let i = 0; i < pairs.length; i += 2) {
              dt[pairs[i]] = pairs[i + 1];
            }
          }),
        ],
      };
    },

    remove(t, ...keys) {
      // remove and return one or more values
      const removed = [];
      return {
        [assignKey]: [
          produce(t, (dt) => {
            for (let i = 0; i < keys.length; ++i) {
              const key = keys[i];
              removed.push(t[key]);
              delete dt[key];
            }
          }),
        ],
        [resultKey]: removed.length === 1 ? removed[0] : removed,
      };
    },
  },

  binaryops: {
    ...containerHandler.binaryops,

    $: checkOp((left, right) => ({
      ...left,
      ...right,
    })),
  },
};

export const timeHandler = {
  ...baseHandler,

  repr(t) {
    return t.toString();
  },

  globals: {
    time(...args) {
      if (args.length === 0) {
        // current time
        return new Date();
      } else if (args.length === 1) {
        // time with milliseconds
        if (typeof args[0] !== 'number') {
          throw new Error('argument is not a number');
        }
        return new Date(args[0]);
      } else if (args.length <= 7) {
        // time with y,m[,d,h,m,s,ms]
        for (let i = 0; i < args.length; ++i) {
          if (typeof args[i] !== 'number') {
            throw new Error('argument is not a number');
          }
        }
        // adjust the month to be 0-based
        args[1]--;
        return new Date(...args);
      }
    },
  },

  methods: {
    part(t, unit) {
      switch (unit.toLowerCase()) {
        case 'year':
        case 'years':
          return t.getFullYear();
        case 'month':
        case 'months':
          return t.getMonth() + 1;
        case 'day':
        case 'days':
          return t.getDate() + 1;
        case 'weekday':
        case 'weekdays':
          return t.getDay() + 1;
        case 'hour':
        case 'hours':
          return t.getHours();
        case 'minute':
        case 'minutes':
          return t.getMinutes();
        case 'second':
        case 'seconds':
          return t.getSeconds();
        case 'millisecond':
        case 'milliseconds':
          return t.getMilliseconds();
        default:
          throw new Error(`invalid time unit: ${unit}`);
      }
    },

    after(t, n, unit) {
      const t2 = new Date(t);
      switch (unit.toLowerCase()) {
        case 'year':
        case 'years':
          t2.setFullYear(t.getFullYear() + n);
          return t2;
        case 'month':
        case 'months':
          t2.setMonth(t.getMonth() + n);
          return t2;
        case 'day':
        case 'days':
          t2.setDate(t.getDate() + n);
          return t2;
        case 'hour':
        case 'hours':
          t2.setHours(t.getHours() + n);
          return t2;
        case 'minute':
        case 'minutes':
          t2.setMinute(t.getMinutes() + n);
          return t2;
        case 'second':
        case 'seconds':
          t2.setSeconds(t.getSeconds() + n);
          return t2;
        case 'millisecond':
        case 'milliseconds':
          t2.setMilliseconds(t.getMilliseconds() + n);
          return t2;
        default:
          throw new Error(`invalid time unit: ${unit}`);
      }
    },

    before(t, n, unit) {
      const t2 = new Date(t);
      switch (unit.toLowerCase()) {
        case 'year':
        case 'years':
          t2.setFullYear(t.getFullYear() - n);
          return t2;
        case 'month':
        case 'months':
          t2.setMonth(t.getMonth() - n);
          return t2;
        case 'day':
        case 'days':
          t2.setDate(t.getDate() - n);
          return t2;
        case 'hour':
        case 'hours':
          t2.setHours(t.getHours() - n);
          return t2;
        case 'minute':
        case 'minutes':
          t2.setMinute(t.getMinutes() - n);
          return t2;
        case 'second':
        case 'seconds':
          t2.setSeconds(t.getSeconds() - n);
          return t2;
        case 'millisecond':
        case 'milliseconds':
          t2.setMilliseconds(t.getMilliseconds() - n);
          return t2;
        default:
          throw new Error(`invalid time unit: ${unit}`);
      }
    },

    startof(t, unit) {
      const t2 = new Date(t);
      switch (unit.toLowerCase()) {
        case 'year':
        case 'years':
          t2.setMonth(0);
        case 'month':
        case 'months':
          t2.setDate(1);
        case 'day':
        case 'days':
          t2.setHours(0);
        case 'hour':
        case 'hours':
          t2.setMinutes(0);
        case 'minute':
        case 'minutes':
          t2.setSeconds(0);
        case 'second':
        case 'seconds':
          t2.setMilliseconds(0);
        case 'millisecond':
        case 'milliseconds':
          // nothing to do but it's a valid unit
          return t2;
        default:
          throw new Error(`invalid time unit: ${unit}`);
      }
    },

    endof(t, unit) {
      const t2 = new Date(t);
      switch (unit.toLowerCase()) {
        case 'year':
        case 'years':
          t2.setMonth(11);
        case 'month':
        case 'months':
          // last day of the month
          t2.setDate(
            new Date(t2.getFullYear(), t2.getMonth() + 1, 0).getDate()
          );
        case 'day':
        case 'days':
          t2.setHours(23);
        case 'hour':
        case 'hours':
          t2.setMinutes(59);
        case 'minute':
        case 'minutes':
          t2.setSeconds(59);
        case 'second':
        case 'seconds':
          t2.setMilliseconds(999);
        case 'millisecond':
        case 'milliseconds':
          // nothing to do but it's a valid unit
          return t2;
        default:
          throw new Error(`invalid time unit: ${unit}`);
      }
    },

    diff(t1, t2, unit) {
      const ms = t2 - t1;
      switch (unit.toLowerCase()) {
        case 'year':
        case 'years':
          return t2.getFullYear() - t1.getFullYear();
        case 'month':
        case 'months':
          return (
            12 * (t2.getFullYear() - t1.getFullYear()) +
            t2.getMonth() -
            t1.getMonth()
          );
        case 'day':
        case 'days':
          return Math.floor(ms / 1000 / 60 / 60 / 24);
        case 'hour':
        case 'hours':
          return Math.floor(ms / 1000 / 60 / 60);
        case 'minute':
        case 'minutes':
          return Math.floor(ms / 1000 / 60);
        case 'second':
        case 'seconds':
          return Math.floor(ms / 1000);
        case 'millisecond':
        case 'milliseconds':
          return Math.floor(ms);
        default:
          throw new Error(`invalid time unit: ${unit}`);
      }
    },
  },

  binaryops: {
    ...baseHandler.binaryops,

    // comparison operators need to cast to number first
    '=': (left, right) => +left === +right,
    '!=': (left, right) => +left !== +right,
  },
};
