/* eslint-disable no-case-declarations */

import { produce, original } from 'immer';

import { assignKey, resultKey } from './runtime';

const hop = Object.prototype.hasOwnProperty; // cache this for performance

const popOut = { pop: 'out' };

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

export function makeInterpreter(app, ctx) {
  // interpreter state
  let fn = {}; // function table
  let fst = []; // frame stack
  let st = []; // namespace stack
  let frame; // top frame
  let ns; // top namespace
  let result; // last evaluated expression

  function run(node) {
    frame = makeFrame(node);
    ns = {};

    // set up an entry point that loops until the stack is exhausted, or
    // until a node returns a promise
    function loop() {
      while (frame) {
        const { node, state } = frame;
        const method = nodes[node.type];
        let ctrl;
        // check arity to see if the handler expects a mutable frame
        if (method.length > 2) {
          frame = produce(frame, df => {
            ctrl = method(node, state, df, frame);
          });
        } else {
          ctrl = method(node, state);
        }
        // deal with the result
        if (ctrl) {
          // check for a promise
          if (ctrl.then) {
            // handle flow and reenter the loop
            return ctrl.then(ctrl => {
              if (ctrl) {
                doFlow(ctrl);
              }
              return loop();
            });
          } else {
            // handle flow instruction
            doFlow(ctrl);
          }
        }
      }
      // take a final snapshot
      // app.snapshot();
    }

    // return a promise for the eventual termination of the loop
    return Promise.resolve()
      .then(loop)
      .catch(orig => {
        const err = new Error(orig.message);
        err.err = orig;
        err.snapshot = snapshot();
        throw err;
      })
      .then(result => ({
        result,
        snapshot: snapshot(),
      }));
  }

  function snapshot() {
    // take a snapshot of the interpreter internals
    // TODO: need to have a way to pass these in as well
    return {
      fn,
      fst,
      st,
      frame,
      ns,
      result,
    };
  }

  // ** manage stack frames **

  function doFlow(ctrl) {
    // deal with any push or pop instruction returned from the node handler
    if (ctrl.type) {
      // it's a node, push it
      push(ctrl);
    } else if (ctrl.pop) {
      // it's a pop instruction
      if (ctrl.pop == 'out') {
        pop();
      } else if (ctrl.pop == 'over') {
        popOver(ctrl.flow);
      } else if (ctrl.pop == 'until') {
        popUntil(ctrl.flow);
      } else if (ctrl.pop == 'exit') {
        // clear the stack so the program exits
        frame = null;
        fst = [];
      }
    }
  }

  function push(node) {
    // optimize literals and vars by setting the result register directly
    if (node.type == 'literal') {
      setResult(node.value);
    } else if (node.type == 'var') {
      // return the rv/lv pair for this assignment
      setResult({
        rv: get(node.name),
        lv: { name: node.name },
      });
    } else {
      // push a new frame onto the stack for this node
      fst = fst.concat(frame);
      frame = makeFrame(node);
    }
  }

  function pushns() {
    // push on a new namespace
    st = st.concat(ns);
    ns = {};
  }

  function pop() {
    if (frame.ns) {
      // pop off the corresponding namespace
      st = produce(st, dst => {
        ns = original(dst.pop());
      });
    }
    // pop this frame off the stack
    fst = produce(fst, dfst => {
      frame = original(dfst.pop());
    });
  }

  function popOver(flow) {
    // pop frames off including a loop or function call node
    while (frame) {
      let { node } = frame;
      // pop the target frame
      pop();
      // break here if we're popping the target frame
      if (node.flow == flow) {
        break;
      }
    }
  }

  function popUntil(flow) {
    // pop frames off until hitting a loop or function call node
    while (frame) {
      // break here if we're popping the target frame
      if (frame.node.flow == flow) {
        break;
      }
      // pop the target frame
      pop();
    }
  }

  // ** return values **

  function setResult(res) {
    // normalize the result to rvalue/lvalue form if necessary
    if (res == null || !hop.call(res, 'rv')) {
      res = { rv: res };
    }
    result = res;
  }

  // ** namespace access **

  function get(name) {
    // look in the top frame
    if (st.length == 0 || hop.call(ns, name)) {
      return ns[name];
    }
    // look up the namespace stack
    for (let i = st.length - 1; i >= 0; --i) {
      const ns = st[i];
      if (hop.call(ns, name)) {
        return ns[name];
      }
    }
  }

  function set(name, value, top = false) {
    // look in the top frame
    if (top || st.length == 0 || hop.call(ns, name)) {
      ns = produce(ns, dns => {
        dns[name] = value;
      });
      return;
    }
    // look up the namespace stack
    st = produce(st, dst => {
      // loop until we hit the root ns
      for (let i = st.length - 1; i >= 0; --i) {
        const dns = dst[i];
        if (i == 0 || hop.call(ns, name)) {
          dns[name] = value;
          break;
        }
      }
    });
  }

  function getIndex(name, indexes) {
    const max = indexes.length - 1;
    // recurse into nested containers
    const next = (b, i) => {
      const h = ctx.handle(b);
      const idx = indexes[i];
      return i == max
        ? h.getindex.call(ctx, b, idx)
        : next(h.getindex.call(ctx, b, idx), i + 1);
    };

    return next(get(name), 0);
  }

  function setIndex(name, indexes, value) {
    const max = indexes.length - 1;
    // recurse into nested containers
    const next = (b, i) => {
      const h = ctx.handle(b);
      const idx = indexes[i];
      return i == max
        ? h.setindex.call(ctx, b, idx, value)
        : h.setindex.call(
            ctx,
            b,
            idx,
            next(h.getindex.call(ctx, b, idx), i + 1)
          );
    };

    set(name, next(get(name), 0));
  }

  // ** handle the result of a function call **

  function handleResult(res, assn) {
    // handle the result of a runtime function
    if (res) {
      let repl = res[assignKey];
      let i, r, a;
      if (repl) {
        // if this result contains replacement args, assign them
        if (!Array.isArray(repl)) {
          repl = [repl];
        }
        // loop over replacement args
        for (i = 0; i < repl.length; ++i) {
          r = repl[i];
          if (r !== undefined) {
            // we have a replacement for this slot
            if ((a = assn[i])) {
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
        res = res[resultKey] || repl[0];
      }
    }
    // put it in the result register
    setResult(res);
  }

  // ** implementations of AST nodes **

  // NOTE: if method takes a 3rd `frame` parameter, the body will be
  // called from within an immer producer

  const nodes = {
    block(node, state, frame, orig) {
      const { count } = orig;
      if (count < node.elems.length) {
        frame.count++;
        return node.elems[count];
      } else {
        return popOut;
      }
    },

    repeat(node, state, frame, orig) {
      switch (state) {
        case 0:
          if (node.times) {
            frame.state = 1;
            return node.times;
          } else {
            frame.state = 3;
            break;
          }
        case 1:
          frame.state = 2;
          frame.times = result.rv;
          break;
        case 2:
          const { count, times } = orig;
          if (count < times) {
            frame.count++;
            return node.body;
          } else {
            return popOut;
          }
        case 3:
          // repeat forever
          return node.body;
      }
    },

    for(node, state, frame, orig) {
      switch (state) {
        case 0:
          frame.state = 1;
          return node.from;
        case 1:
          const res = result.rv;
          frame.state = 2;
          frame.from = res;
          frame.count = res;
          return node.to;
        case 2:
          if (node.by) {
            frame.state = 3;
            frame.to = result.rv;
            return node.by;
          } else {
            frame.state = 4;
            frame.to = result.rv;
            break;
          }
        case 3:
          frame.state = 4;
          frame.by = result.rv;
          break;
        case 4:
          const { count, to, by } = orig;
          if ((by > 0 && count <= to) || (by < 0 && count >= to)) {
            set(node.name, count);
            frame.count += by;
            return node.body;
          } else {
            return popOut;
          }
      }
    },

    forIn(node, state, frame, orig) {
      switch (state) {
        case 0:
          frame.state = 1;
          return node.range;
        case 1:
          frame.state = 2;
          frame.iter = ctx.enumerate(result.rv);
          break;
        case 2:
          const { iter } = orig;
          if (iter.more) {
            set(node.name, iter.value);
            // TODO: iteration should allow async
            frame.iter = iter.next();
            return node.body;
          } else {
            return popOut;
          }
      }
    },

    while(node, state, frame) {
      switch (state) {
        case 0:
          frame.state = 1;
          return node.cond;
        case 1:
          if (result.rv) {
            frame.state = 0;
            return node.body;
          } else {
            return popOut;
          }
      }
    },

    if(node, state, frame) {
      switch (state) {
        case 0:
          frame.state = 1;
          return node.cond;
        case 1:
          if (result.rv) {
            frame.state = 2;
            return node.tbody;
          } else if (node.fbody) {
            frame.state = 2;
            return node.fbody;
          } else {
            return popOut;
          }
        case 2:
          return popOut;
      }
    },

    begin(node) {
      // save the begin node in the function table
      fn = produce(fn, dfn => {
        dfn[node.name] = node;
      });
      return popOut;
    },

    call(node, state, frame, orig) {
      switch (state) {
        case 0:
          const { count } = orig;
          if (node.args && count < node.args.length) {
            frame.state = 1;
            return node.args[count];
          } else if (hop.call(fn, node.name)) {
            frame.state = 2;
            break;
          } else {
            frame.state = 4;
            break;
          }
        case 1:
          frame.state = 0;
          frame.args.push(result.rv);
          frame.assn.push(result.lv);
          frame.count++;
          break;
        case 2:
          // handle a user-defined function
          const ufn = fn[node.name];
          // push on a new namespace
          pushns();
          // set the arguments in the local ns
          if (ufn.params) {
            for (let i = 0; i < ufn.params.length; ++i) {
              set(ufn.params[i], orig.args[i], true);
            }
          }
          frame.state = 3;
          frame.ns = true;
          return ufn.body;
        case 3:
          return popOut;
        case 4:
          // handle a runtime API function
          const res = ctx.syscall(node.name, orig.args);
          if (res && res.then) {
            // if we got a promise, handle the result when fulfilled
            return res.then(res => {
              handleResult(res, orig.assn);
              return popOut;
            });
          } else {
            handleResult(res, orig.assn);
            return popOut;
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

    return(node, state, frame) {
      switch (state) {
        case 0:
          if (node.result) {
            frame.state = 1;
            return node.result;
          } else {
            setResult();
            return { pop: 'over', flow: 'call' };
          }
        case 1:
          setResult(result.rv);
          return { pop: 'over', flow: 'call' };
      }
    },

    literal(node) {
      setResult(node.value);
      return popOut;
    },

    var(node) {
      // return the rv/lv pair for this var
      setResult({
        rv: get(node.name),
        lv: { name: node.name },
      });
      return popOut;
    },

    let(node, state, frame) {
      switch (state) {
        case 0:
          frame.state = 1;
          return node.value;
        case 1:
          set(node.name, result.rv, node.top);
          return popOut;
      }
    },

    index(node, state, frame, orig) {
      switch (state) {
        case 0:
          const { count } = orig;
          if (count < node.indexes.length) {
            frame.state = 1;
            return node.indexes[count];
          } else {
            frame.state = 2;
            break;
          }
        case 1:
          frame.state = 0;
          frame.indexes.push(result.rv);
          frame.count++;
          break;
        case 2:
          const indexes = orig.indexes;
          // return the rv/lv pair for this slot
          setResult({
            rv: getIndex(node.name, indexes),
            lv: { name: node.name, indexes },
          });
          return popOut;
      }
    },

    letIndex(node, state, frame, orig) {
      switch (state) {
        case 0:
          const { count } = orig;
          if (count < node.indexes.length) {
            frame.state = 1;
            return node.indexes[count];
          } else {
            frame.state = 2;
            break;
          }
        case 1:
          frame.state = 0;
          frame.indexes.push(result.rv);
          frame.count++;
          break;
        case 2:
          frame.state = 3;
          return node.value;
        case 3:
          setIndex(node.name, orig.indexes, result.rv);
          return popOut;
      }
    },

    logicalOp(node, state, frame) {
      switch (node.op) {
        case 'and':
          switch (state) {
            case 0:
              frame.state = 1;
              return node.left;
            case 1:
              if (!result.rv) {
                setResult(false);
                return popOut;
              } else {
                frame.state = 2;
                return node.right;
              }
            case 2:
              setResult(!!result.rv);
              return popOut;
          }
          break;

        case 'or':
          switch (state) {
            case 0:
              frame.state = 1;
              return node.left;
            case 1:
              if (result.rv) {
                setResult(true);
                return popOut;
              } else {
                frame.state = 2;
                return node.right;
              }
            case 2:
              setResult(!!result.rv);
              return popOut;
          }
          break;

        case 'not':
          switch (state) {
            case 0:
              frame.state = 1;
              return node.right;
            case 1:
              setResult(!result.rv);
              return popOut;
          }
          break;
      }
    },

    binaryOp(node, state, frame, orig) {
      switch (state) {
        case 0:
          frame.state = 1;
          return node.left;
        case 1:
          frame.state = 2;
          frame.left = result.rv;
          return node.right;
        case 2:
          setResult(ctx.binaryop(node.op, orig.left, result.rv));
          return popOut;
      }
    },

    unaryOp(node, state, frame) {
      switch (state) {
        case 0:
          frame.state = 1;
          return node.right;
        case 1:
          setResult(ctx.unaryop(node.op, result.rv));
          return popOut;
      }
    },
  };

  // set an empty result value
  setResult();

  // return the run() function
  return run;
}
