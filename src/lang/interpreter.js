import { produce, original } from 'immer';

import {
  builtinGlobals,
  noneHandler,
  booleanHandler,
  numberHandler,
  stringHandler,
  timeHandler,
  listHandler,
  tableHandler,
} from './builtins.js';

// for built-in object prototypes to store a handler reference
export const handlerKey = Symbol('START_HANDLER');

// for runtime API functions to specify how they are assigned-to or returned
export const assignKey = Symbol('START_ASSIGN');
export const resultKey = Symbol('START_RESULT');

const hop = Object.prototype.hasOwnProperty; // cache this for performance

const popOut = { pop: 'out' };

export function handle(value) {
  if (value === null || value === undefined) {
    return noneHandler;
  } else {
    switch (typeof value) {
      case 'boolean':
        return booleanHandler;
      case 'number':
        return numberHandler;
      case 'string':
        return stringHandler;
      case 'object':
        if (value.constructor === Date) {
          return timeHandler;
        } else if (Array.isArray(value)) {
          return listHandler;
        } else {
          return value[handlerKey] || tableHandler;
        }
      default:
        throw new Error(`could not determine type for ${value}`);
    }
  }
}

// ** interpreter internals **

function makeFrame(node) {
  return {
    node, // node for this evaluation frame
    state: 0, // evaluation state machine state
    ns: false, // whether to pop a ns off the stack for this frame
    // commonly used loop states
    count: 0,
    times: 0,
    from: 0,
    to: 0,
    by: 1,
    // commonly used for gathering indexes or params
    indexes: [],
    args: [],
    assn: [],
    // less commonly used object references
    iter: null,
    left: null,
  };
}

export function makeInterpreter() {
  // interpreter globals
  const globals = {};

  function registerGlobals(fns) {
    for (const name in fns) {
      globals[name] = fns[name];
    }
  }

  function registerHandler(handler) {
    registerGlobals(handler.globals);
  }

  registerGlobals(builtinGlobals);
  registerHandler(noneHandler);
  registerHandler(booleanHandler);
  registerHandler(numberHandler);
  registerHandler(stringHandler);
  registerHandler(timeHandler);
  registerHandler(listHandler);
  registerHandler(tableHandler);

  function syscall(name, args) {
    // try to find the function to call
    const fn =
      (args.length > 0 && handle(args[0]).methods[name]) || globals[name];
    if (!fn) {
      throw new Error(`object not found or not a function: ${name}`);
    }

    // make the call
    return fn(...args);
  }

  // interpreter state
  let gfn; // function table
  let gns; // global namespace
  let lns; // top namespace
  let lst; // namespace stack
  let fra; // top frame
  let fst; // frame stack
  let res; // last evaluated expression

  // set up an entry point that loops until the stack is exhausted, or
  // until a node returns a promise
  async function loop() {
    while (fra) {
      const { node, state } = fra;
      const method = nodes[node.type];
      let ctrl;
      // check arity to see if the handler expects a draft frame
      if (method.length === 3) {
        fra = produce(fra, (dfra) => {
          ctrl = method(node, state, dfra);
        });
      } else {
        ctrl = method(node, state);
      }
      // deal with the result
      if (ctrl) {
        // check for a promise
        if (ctrl.then) {
          const rctrl = await ctrl;
          if (rctrl) {
            // handle flow instruction
            flow(rctrl);
          }
        } else {
          // handle flow instruction
          flow(ctrl);
        }
      }
    }
  }

  function init() {
    // initialize the global interpreter state
    gfn = {};
    gns = {};
  }

  function run(node) {
    // initialize the local state
    lns = {};
    lst = [];
    fra = makeFrame(node);
    fst = [];

    // set an empty result
    setResult();

    // run the loop
    return loop();
  }

  // ** snapshot internal state **

  function snapshot() {
    // take a snapshot of the interpreter internals
    return {
      gfn,
      gns,
      lns,
      lst,
      fra,
      fst,
      res,
    };
  }

  function reset(snap) {
    // reset the interpreter state to the passed-in snapshot
    gfn = snap.gfn;
    gns = snap.gns;
    lns = snap.lns;
    lst = snap.lst;
    fra = snap.fra;
    fst = snap.fst;
    res = snap.res;
  }

  // ** manage stack frames **

  function flow(ctrl) {
    // deal with any push or pop instruction returned from the node handler
    if (ctrl.type) {
      // it's a node, push it
      push(ctrl);
    } else if (ctrl.pop) {
      // it's a pop instruction
      if (ctrl.pop === 'out') {
        pop();
      } else if (ctrl.pop === 'over') {
        popOver(ctrl.flow);
      } else if (ctrl.pop === 'until') {
        popUntil(ctrl.flow);
      } else if (ctrl.pop === 'exit') {
        // clear the stack so the program exits
        fra = null;
        fst = [];
      }
    }
  }

  function push(node) {
    // optimize literals and vars by setting the result register directly
    if (node.type === 'literal') {
      setResult(node.value);
    } else if (node.type === 'var') {
      // return the rhs/lhs pair for this assignment
      setResult({
        rhs: get(node.name),
        lhs: { name: node.name },
      });
    } else {
      // push a new frame onto the stack for this node
      fst = produce(fst, (dfst) => {
        dfst.push(fra);
      });
      fra = makeFrame(node);
    }
  }

  function pushns() {
    // push on a new namespace
    lst = produce(lst, (dlst) => {
      dlst.push(lns);
    });
    lns = {};
  }

  function pop() {
    if (fra.ns) {
      // pop off the corresponding namespace
      lst = produce(lst, (dlst) => {
        lns = original(dlst.pop());
      });
    }
    // pop this frame off the stack
    if (fst.length === 0) {
      fra = null;
    } else {
      fst = produce(fst, (dfst) => {
        fra = original(dfst.pop());
      });
    }
  }

  function popOver(flow) {
    // pop frames off including a loop or function call node
    while (fra) {
      const { node } = fra;
      // pop the target frame
      pop();
      // break here if we're popping the target frame
      if (node.flow === flow) {
        break;
      }
    }
  }

  function popUntil(flow) {
    // pop frames off until hitting a loop or function call node
    while (fra) {
      // break here if we're popping the target frame
      if (fra.node.flow === flow) {
        break;
      }
      // pop the target frame
      pop();
    }
  }

  // ** return values **

  function setResult(result) {
    if (!result || !hop.call(result, 'rhs')) {
      // normalize the result to rvalue/lvalue form
      res = { rhs: result };
    } else {
      res = result;
    }
  }

  // ** namespace access **

  function get(name) {
    if (hop.call(lns, name)) {
      // look in the top frame
      return lns[name];
    } else {
      // look in the global namespace
      return gns[name];
    }
  }

  function set(name, value, local = false) {
    if (local || hop.call(lns, name)) {
      // look in the top frame
      lns = produce(lns, (dns) => {
        dns[name] = value;
      });
    } else {
      // look in the global namespace
      gns = produce(gns, (dgns) => {
        dgns[name] = value;
      });
    }
  }

  function getIndex(name, indexes) {
    const max = indexes.length - 1;
    return next(get(name), 0);

    // recurse into nested containers
    function next(b, i) {
      const h = handle(b);
      const idx = indexes[i];
      return i === max ? h.getindex(b, idx) : next(h.getindex(b, idx), i + 1);
    }
  }

  function setIndex(name, indexes, value) {
    const max = indexes.length - 1;
    set(name, next(get(name), 0));

    // recurse into nested containers
    function next(b, i) {
      const h = handle(b);
      const idx = indexes[i];
      if (i === max) {
        return h.setindex(b, idx, value);
      } else {
        const nv = h.getindex(b, idx);
        return h.setindex(b, idx, next(nv, i + 1));
      }
    }
  }

  // ** handle the result of a function call **

  function handleResult(ret, assn) {
    // handle the result of a runtime function
    if (ret) {
      const repl = ret[assignKey];
      if (repl) {
        // loop over replacement args
        for (let i = 0; i < repl.length; ++i) {
          const r = repl[i];
          if (r !== undefined) {
            // we have a replacement for this slot
            const a = assn[i];
            if (a !== undefined) {
              // this slot can be assigned to
              if (a.indexes) {
                setIndex(a.name, a.indexes, r);
              } else {
                set(a.name, r);
              }
            }
          }
        }
        // grab an explicit result, or the first replacement
        ret = ret[resultKey] || repl[0];
      }
    }
    // put it in the result register
    setResult(ret);
  }

  // ** implementations of AST nodes **

  // NOTE: if method takes a 3rd frame parameter, the body will be
  // called from within an immer producer

  const nodes = {
    block(node, state, dfra) {
      const { count } = fra;
      if (count < node.elems.length) {
        dfra.count++;
        return node.elems[count];
      } else {
        return popOut;
      }
    },

    repeat(node, state, dfra) {
      switch (state) {
        case 0: {
          if (node.times) {
            dfra.state = 1;
            return node.times;
          } else {
            dfra.state = 3;
            break;
          }
        }
        case 1: {
          dfra.state = 2;
          dfra.times = res.rhs;
          break;
        }
        case 2: {
          const { count, times } = fra;
          if (count < times) {
            dfra.count++;
            return node.body;
          } else {
            return popOut;
          }
        }
        case 3: {
          // repeat forever
          return node.body;
        }
      }
    },

    for(node, state, dfra) {
      switch (state) {
        case 0: {
          dfra.state = 1;
          return node.from;
        }
        case 1: {
          dfra.state = 2;
          dfra.from = res.rhs;
          dfra.count = res.rhs;
          return node.to;
        }
        case 2: {
          if (node.by) {
            dfra.state = 3;
            dfra.to = res.rhs;
            return node.by;
          } else {
            dfra.state = 4;
            dfra.to = res.rhs;
            break;
          }
        }
        case 3: {
          dfra.state = 4;
          dfra.by = res.rhs;
          break;
        }
        case 4: {
          const { count, to, by } = fra;
          if ((by > 0 && count <= to) || (by < 0 && count >= to)) {
            set(node.name, count);
            dfra.count += by;
            return node.body;
          } else {
            return popOut;
          }
        }
      }
    },

    forIn(node, state, dfra) {
      switch (state) {
        case 0: {
          dfra.state = 1;
          return node.range;
        }
        case 1: {
          dfra.state = 2;
          dfra.iter = handle(res.rhs).enumerate(res.rhs);
          break;
        }
        case 2: {
          const { iter } = fra;
          if (iter.more) {
            set(node.name, iter.value);
            // TODO: iteration should allow async
            dfra.iter = iter.next();
            return node.body;
          } else {
            return popOut;
          }
        }
      }
    },

    while(node, state, dfra) {
      switch (state) {
        case 0: {
          dfra.state = 1;
          return node.cond;
        }
        case 1: {
          if (res.rhs) {
            dfra.state = 0;
            return node.body;
          } else {
            return popOut;
          }
        }
      }
    },

    if(node, state, dfra) {
      switch (state) {
        case 0: {
          dfra.state = 1;
          return node.cond;
        }
        case 1: {
          if (res.rhs) {
            dfra.state = 2;
            return node.tbody;
          } else if (node.fbody) {
            dfra.state = 2;
            return node.fbody;
          } else {
            return popOut;
          }
        }
        case 2: {
          return popOut;
        }
      }
    },

    begin(node) {
      // save the begin node in the function table
      gfn = produce(gfn, (dgfn) => {
        dgfn[node.name] = node;
      });
      return popOut;
    },

    call(node, state, dfra) {
      switch (state) {
        case 0: {
          const { count } = fra;
          if (node.args && count < node.args.length) {
            dfra.state = 1;
            return node.args[count];
          } else if (hop.call(gfn, node.name)) {
            dfra.state = 2;
            break;
          } else {
            dfra.state = 4;
            break;
          }
        }
        case 1: {
          dfra.state = 0;
          dfra.args.push(res.rhs);
          dfra.assn.push(res.lhs);
          dfra.count++;
          break;
        }
        case 2: {
          // handle a user-defined function
          const ufn = gfn[node.name];
          // push on a new namespace
          pushns();
          // set the arguments in the local ns
          if (ufn.params) {
            for (let i = 0; i < ufn.params.length; ++i) {
              set(ufn.params[i], fra.args[i], true);
            }
          }
          dfra.state = 3;
          dfra.ns = true;
          return ufn.body;
        }
        case 3: {
          return popOut;
        }
        case 4: {
          // handle a runtime API function
          const ret = syscall(node.name, fra.args);
          if (ret && ret.then) {
            // if we got a promise, handle the result when fulfilled
            return ret.then((rret) => {
              handleResult(rret, fra.assn);
              return popOut;
            });
          } else {
            handleResult(ret, fra.assn);
            return popOut;
          }
        }
      }
    },

    exit() {
      return { pop: 'exit' };
    },

    break() {
      return { pop: 'over', flow: 'loop' };
    },

    next() {
      return { pop: 'until', flow: 'loop' };
    },

    return(node, state, dfra) {
      switch (state) {
        case 0: {
          if (node.result) {
            dfra.state = 1;
            return node.result;
          } else {
            setResult();
            return { pop: 'over', flow: 'call' };
          }
        }
        case 1: {
          setResult(res.rhs);
          return { pop: 'over', flow: 'call' };
        }
      }
    },

    literal(node) {
      setResult(node.value);
      return popOut;
    },

    var(node) {
      // return the rhs/lhs pair for this var
      setResult({
        rhs: get(node.name),
        lhs: { name: node.name },
      });
      return popOut;
    },

    let(node, state, dfra) {
      switch (state) {
        case 0: {
          dfra.state = 1;
          return node.value;
        }
        case 1: {
          set(node.name, res.rhs, node.local);
          return popOut;
        }
      }
    },

    index(node, state, dfra) {
      switch (state) {
        case 0: {
          const { count } = fra;
          if (count < node.indexes.length) {
            dfra.state = 1;
            return node.indexes[count];
          } else {
            dfra.state = 2;
            break;
          }
        }
        case 1: {
          dfra.state = 0;
          dfra.indexes.push(res.rhs);
          dfra.count++;
          break;
        }
        case 2: {
          const { indexes } = fra;
          // return the rhs/lhs pair for this slot
          setResult({
            rhs: getIndex(node.name, indexes),
            lhs: { name: node.name, indexes },
          });
          return popOut;
        }
      }
    },

    letIndex(node, state, dfra) {
      switch (state) {
        case 0: {
          const { count } = fra;
          if (count < node.indexes.length) {
            dfra.state = 1;
            return node.indexes[count];
          } else {
            dfra.state = 2;
            break;
          }
        }
        case 1: {
          dfra.state = 0;
          dfra.indexes.push(res.rhs);
          dfra.count++;
          break;
        }
        case 2: {
          dfra.state = 3;
          return node.value;
        }
        case 3: {
          setIndex(node.name, fra.indexes, res.rhs);
          return popOut;
        }
      }
    },

    logicalOp(node, state, dfra) {
      switch (node.op) {
        case 'and':
          switch (state) {
            case 0: {
              dfra.state = 1;
              return node.left;
            }
            case 1: {
              if (!res.rhs) {
                setResult(false);
                return popOut;
              } else {
                dfra.state = 2;
                return node.right;
              }
            }
            case 2: {
              setResult(!!res.rhs);
              return popOut;
            }
          }
          break;

        case 'or':
          switch (state) {
            case 0: {
              dfra.state = 1;
              return node.left;
            }
            case 1: {
              if (res.rhs) {
                setResult(true);
                return popOut;
              } else {
                dfra.state = 2;
                return node.right;
              }
            }
            case 2: {
              setResult(!!res.rhs);
              return popOut;
            }
          }
          break;

        case 'not':
          switch (state) {
            case 0: {
              dfra.state = 1;
              return node.right;
            }
            case 1: {
              setResult(!res.rhs);
              return popOut;
            }
          }
          break;
      }
    },

    binaryOp(node, state, dfra) {
      switch (state) {
        case 0: {
          dfra.state = 1;
          return node.left;
        }
        case 1: {
          dfra.state = 2;
          dfra.left = res.rhs;
          return node.right;
        }
        case 2: {
          const binaryop = handle(fra.left).binaryops[node.op];
          setResult(binaryop(fra.left, res.rhs));
          return popOut;
        }
      }
    },

    unaryOp(node, state, dfra) {
      switch (state) {
        case 0: {
          dfra.state = 1;
          return node.right;
        }
        case 1: {
          const unaryop = handle(res.rhs).unaryops[node.op];
          setResult(unaryop(res.rhs));
          return popOut;
        }
      }
    },
  };

  // return the interpreter api
  return {
    registerGlobals,
    registerHandler,
    init,
    run,
    snapshot,
    reset,
  };
}
