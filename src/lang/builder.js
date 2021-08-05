const hop = Object.prototype.hasOwnProperty;

const flowMarker = {
  repeat: 'loop',
  for: 'loop',
  forIn: 'loop',
  while: 'loop',
  call: 'call',
};

const inspectMarker = {
  repeat: 'loop',
  for: 'loop',
  forIn: 'loop',
  while: 'loop',
  if: 'stmt',
  begin: 'stmt',
  call: 'stmt',
  exit: 'stmt',
  break: 'stmt',
  next: 'stmt',
  return: 'stmt',
  literal: 'expr',
  var: 'expr',
  let: 'stmt',
  index: 'expr',
  letIndex: 'stmt',
  logicalOp: 'expr',
  binaryOp: 'expr',
  unaryOp: 'expr',
};

function buildNode(type, block, attrs) {
  // if we're a block with one statement, just return the statement itself
  if (type === 'block' && attrs.elems.length === 1) {
    return attrs.elems[0];
  }

  // show the type first
  const node = { type };

  // then the flow marker
  if (flowMarker[type]) {
    node.flow = flowMarker[type];
  }

  // then the inspect marker
  if (inspectMarker[type]) {
    node.inspect = inspectMarker[type];
  }

  // then the passed-in attributes
  Object.assign(node, attrs);

  return node;
}

function wrapLiteral(value, block) {
  // if it's already a node, pass it through
  return value && hop.call(value, 'type')
    ? value
    : buildNode('literal', block, { value });
}

export function makeBlocklyBuilder() {
  const blocks = [];
  const temps = {};

  function fromWorkspace(ws) {
    // build a program tree from the blockly workspace
    const blocks = ws.getTopBlocks(true);
    const funcs = [];
    const elems = [];

    for (let i = 0; i < blocks.length; ++i) {
      const stmt = handleStatements(blocks[i]);

      if (stmt.type === 'begin') {
        // collect functions into their own list
        funcs.push(stmt);
      } else if (stmt.type === 'block') {
        // collect all of this block's statments
        elems.push(...stmt.elems);
      } else {
        // push this statement
        elems.push(stmt);
      }
    }

    // prepend any functions we found
    elems.unshift(...funcs);

    return buildNode('block', null, { elems });
  }

  function handleValue(block, name) {
    // just dispatch on block type
    const target = name ? block.getInputTargetBlock(name) : block;
    return target && nodes[target.type](target);
  }

  function handleStatements(block, name) {
    const elems = [];

    // push the current statement block onto the stack
    blocks.push(elems);

    try {
      // just dispatch on block type
      let target = name ? block.getInputTargetBlock(name) : block;

      while (target) {
        const stmt = nodes[target.type](target);
        // if we get nothing back, don't create a statement
        if (stmt) {
          elems.push(stmt);
        }
        // statement blocks are chained together
        target = target.nextConnection && target.nextConnection.targetBlock();
      }
    } finally {
      blocks.pop();
    }

    // if there was only one, just return the first, otherwise
    // wrap it in a block node
    return elems.length === 1 ? elems[0] : buildNode('block', block, { elems });
  }

  function makeTemporary(value, block, prefix) {
    // get next available temp var with this prefix and make an assignment
    const count = (temps[prefix] = (temps[prefix] || 0) + 1);
    const name = `temp_${prefix}_${count}`;

    const elem = buildNode('const', block, { name, value });

    // append it to the nearest statements block
    blocks[blocks.length - 1].push(elem);

    // return a var node for the temporary
    return buildNode('var', block, { name });
  }

  function getPosition(val, block, suffix) {
    // - assumes val is a var node -- caller should ensure that makeTemporary
    //   is called if it might be an arbitrary value expression
    // - assumes val can have len() called on it (a string or list)
    suffix = suffix || '';
    const where = block.getFieldValue(`WHERE${suffix}`);
    const at = handleValue(block, `AT${suffix}`);

    // we'll need this in a couple places
    const len = buildNode('call', block, {
      name: 'len',
      args: [val],
    });

    switch (where) {
      case 'FIRST':
        return wrapLiteral(1, block);
      case 'LAST':
        return len;
      case 'FROM_START':
        return at;
      case 'FROM_END':
        // 1-based positioning, need to adjust at by 1
        if (at.type === 'literal') {
          // we can subtract up front
          --at.value;
          if (at.value === 0) {
            // at is 0, so len is already what we need
            return len;
          } else {
            // len - at
            return buildNode('binaryOp', block, {
              name: '-',
              args: [len, at],
            });
          }
        } else {
          // have to emit code to adjust the result by 1
          return buildNode('binaryOp', block, {
            op: '+',
            left: buildNode('binaryOp', block, {
              name: '-',
              args: [len, at],
            }),
            right: wrapLiteral(1, block),
          });
        }
      case 'RANDOM':
        // build a rand() expression over the range from 1 to len
        return buildNode('call', block, {
          name: 'rand',
          args: [
            wrapLiteral(1, block),
            buildNode('call', block, {
              name: 'len',
              args: [val],
            }),
          ],
        });
    }
  }

  // control
  const nodes = {
    control_exit(block) {
      return buildNode('exit', block);
    },

    // loops

    controls_repeat_ext(block) {
      return buildNode('repeat', block, {
        times: handleValue(block, 'TIMES'),
        body: handleStatements(block, 'DO'),
      });
    },

    controls_whileUntil(block) {
      let cond = handleValue(block, 'BOOL');

      if (block.getFieldValue('MODE') === 'UNTIL') {
        // reverse the condition
        cond = buildNode('logicalOp', block, {
          op: 'not',
          right: cond,
        });
      }

      return buildNode('while', block, {
        cond: cond,
        body: handleStatements(block, 'DO'),
      });
    },

    controls_for(block) {
      return buildNode('for', block, {
        name: block.getFieldValue('VAR'),
        from: handleValue(block, 'FROM'),
        to: handleValue(block, 'TO'),
        by: handleValue(block, 'BY'),
        body: handleStatements(block, 'DO'),
      });
    },

    controls_forEach(block) {
      return buildNode('forIn', block, {
        name: block.getFieldValue('VAR'),
        range: handleValue(block, 'LIST'),
        body: handleStatements(block, 'DO'),
      });
    },

    controls_flow_statements(block) {
      const FLOWS = {
        BREAK: 'break',
        CONTINUE: 'next',
      };

      return buildNode(FLOWS[block.getFieldValue('FLOW')], block);
    },

    // logic

    controls_if(block) {
      // the top-level if block
      const top = buildNode('if', block, {
        cond: handleValue(block, 'IF0'),
        tbody: handleStatements(block, 'DO0'),
      });

      let current = top;

      for (let i = 1; i <= block.elseifCount_; ++i) {
        // create a nested if block inside the else block
        current.fbody = buildNode('if', block, {
          cond: handleValue(block, `IF${i}`),
          tbody: handleStatements(block, `DO${i}`),
        });

        current = current.fbody;
      }

      if (block.elseCount_) {
        // create the final else block
        current.fbody = handleStatements(block, 'ELSE');
      }

      return top;
    },

    logic_compare(block) {
      const OPERATORS = {
        EQ: '=',
        NEQ: '!=',
        LT: '<',
        LTE: '<=',
        GT: '>',
        GTE: '>=',
      };

      return buildNode('binaryOp', block, {
        op: OPERATORS[block.getFieldValue('OP')],
        left: handleValue(block, 'A'),
        right: handleValue(block, 'B'),
      });
    },

    logic_operation(block) {
      return buildNode('logicalOp', block, {
        op: block.getFieldValue('OP').toLowerCase(),
        left: handleValue(block, 'A'),
        right: handleValue(block, 'B'),
      });
    },

    logic_negate(block) {
      return buildNode('logicalOp', block, {
        op: 'not',
        right: handleValue(block, 'BOOL'),
      });
    },

    logic_boolean(block) {
      return wrapLiteral(block.getFieldValue('BOOL') === 'TRUE', block);
    },

    logic_null(block) {
      return wrapLiteral(null, block);
    },

    // math

    math_number(block) {
      return wrapLiteral(parseFloat(block.getFieldValue('NUM')), block);
    },

    math_angle(block) {
      return wrapLiteral(parseFloat(block.getFieldValue('ANGLE')), block);
    },

    math_arithmetic(block) {
      const OPERATORS = {
        ADD: '+',
        MINUS: '-',
        MULTIPLY: '*',
        DIVIDE: '/',
      };

      const op = block.getFieldValue('OP');

      if (op === 'POWER') {
        return buildNode('call', block, {
          name: 'exp',
          args: [handleValue(block, 'A'), handleValue(block, 'B')],
        });
      } else {
        return buildNode('binaryOp', block, {
          op: OPERATORS[op],
          left: handleValue(block, 'A'),
          right: handleValue(block, 'B'),
        });
      }
    },

    math_single(block) {
      const FUNCS = {
        ROOT: 'sqrt',
        LN: 'log',
        ROUNDUP: 'ceil',
        ROUNDDOWN: 'floor',
      };

      const func = block.getFieldValue('OP');
      const num = handleValue(block, 'NUM');

      switch (func) {
        case 'NEG':
          return buildNode('unaryOp', block, {
            op: '-',
            right: num,
          });
        case 'LOG10':
          return buildNode('call', block, {
            name: 'log',
            args: [wrapLiteral(10, block), num],
          });
        case 'POW10':
          return buildNode('call', block, {
            name: 'exp',
            args: [wrapLiteral(10, block), num],
          });
        default:
          return buildNode('call', block, {
            name: FUNCS[func] || func.toLowerCase(),
            args: [num],
          });
      }
    },

    math_round(block) {
      return nodes.math_single(block);
    },

    math_trig(block) {
      return nodes.math_single(block);
    },

    math_number_property(block) {
      const prop = block.getFieldValue('PROPERTY');
      const num = handleValue(block, 'NUMBER_TO_CHECK');

      // construct an 'x % y === z' test
      function buildModTest(denom, test) {
        return buildNode('binaryOp', block, {
          op: '=',
          left: buildNode('binaryOp', block, {
            op: '%',
            left: num,
            right: wrapLiteral(denom, block),
          }),
          right: wrapLiteral(test, block),
        });
      }

      // construct an 'x >/< 0' test
      function buildLGTest(op) {
        return buildNode('binaryOp', block, {
          op: op,
          left: num,
          right: wrapLiteral(0, block),
        });
      }

      switch (prop) {
        case 'EVEN':
          return buildModTest(2, 0);
        case 'ODD':
          return buildModTest(2, 1);
        case 'WHOLE':
          return buildModTest(1, 0);
        case 'DIVISIBLE_BY':
          return buildModTest(handleValue(block, 'DIVISOR'), 0);
        case 'POSITIVE':
          return buildLGTest('>');
        case 'NEGATIVE':
          return buildLGTest('<');
      }
    },

    math_change(block) {
      const name = block.getFieldValue('VAR');
      const delta = handleValue(block, 'DELTA');
      let sign = '+';

      if (delta.type === 'literal' && delta.value < 0) {
        // if delta is a literal negative number, be nice and build
        // a minus expression
        delta.value = -delta.value;
        sign = '-';
      }

      return buildNode('const', block, {
        name: name,
        value: buildNode('binaryOp', block, {
          op: sign,
          left: buildNode('var', block, {
            name: name,
          }),
          right: delta,
        }),
      });
    },

    math_modulo(block) {
      return buildNode('binaryOp', block, {
        op: '%',
        left: handleValue(block, 'DIVIDEND'),
        right: handleValue(block, 'DIVISOR'),
      });
    },

    math_constrain(block) {
      const valueOrDefault = (name, default_) =>
        handleValue(block, name) || wrapLiteral(default_);

      return buildNode('call', block, {
        name: 'clamp',
        args: [
          handleValue(block, 'VALUE'),
          valueOrDefault('LOW', 0),
          valueOrDefault('HIGH', Infinity),
        ],
      });
    },

    math_random_int(block) {
      return buildNode('call', block, {
        name: 'rand',
        args: [handleValue(block, 'FROM'), handleValue(block, 'TO')],
      });
    },

    math_random_float(block) {
      return buildNode('call', block, {
        name: 'rand',
        args: [],
      });
    },

    // text

    text(block) {
      return wrapLiteral(block.getFieldValue('TEXT'), block);
    },

    text_join(block) {
      let str = handleValue(block, 'ADD0');

      if (!(str.type === 'literal' && typeof str.value === 'string')) {
        str = buildNode('binaryOp', block, {
          op: '$',
          left: wrapLiteral('', block),
          right: str,
        });
      }

      for (let i = 1; i < block.itemCount_; ++i) {
        str = buildNode('binaryOp', block, {
          op: '$',
          left: str,
          right: handleValue(block, `ADD${i}`),
        });
      }

      return str;
    },

    text_append(block) {
      const name = block.getFieldValue('VAR');

      return buildNode('const', block, {
        name: name,
        value: buildNode('binaryOp', block, {
          op: '$',
          left: buildNode('var', block, {
            name: name,
          }),
          right: handleValue(block, 'TEXT'),
        }),
      });
    },

    text_length(block) {
      return buildNode('call', block, {
        name: 'len',
        args: [handleValue(block, 'VALUE')],
      });
    },

    text_isEmpty(block) {
      return buildNode('binaryOp', block, {
        op: '=',
        left: nodes.text_length(block),
        right: wrapLiteral(0, block),
      });
    },

    text_indexOf(block) {
      const mode = block.getFieldValue('END').toLowerCase();

      return buildNode('call', block, {
        name: mode,
        args: [handleValue(block, 'VALUE'), handleValue(block, 'FIND')],
      });
    },

    text_charAt(block) {
      let val = handleValue(block, 'VALUE');

      if (val.type !== 'var') {
        val = makeTemporary(val, block, 'string');
      }

      return buildNode('index', block, {
        name: val.name,
        indexes: [getPosition(val, block)],
      });
    },

    text_getSubstring(block) {
      let val = handleValue(block, 'STRING');

      if (val.type !== 'literal' && val.type !== 'var') {
        val = makeTemporary(val, block, 'string');
      }

      return buildNode('call', block, {
        name: 'copy',
        args: [val, getPosition(val, block, '1'), getPosition(val, block, '2')],
      });
    },

    text_changeCase(block) {
      const CASES = {
        UPPERCASE: 'upper',
        LOWERCASE: 'lower',
        TITLECASE: 'title',
      };

      return buildNode('call', block, {
        name: CASES[block.getFieldValue('CASE')],
        args: [handleValue(block, 'TEXT')],
      });
    },

    text_trim(block) {
      const TRIMS = {
        LEFT: 'ltrim',
        RIGHT: 'rtrim',
        BOTH: 'trim',
      };

      return buildNode('call', block, {
        name: TRIMS[block.getFieldValue('MODE')],
        args: [handleValue(block, 'TEXT')],
      });
    },

    text_prompt_ext(block) {
      let input = buildNode('call', block, {
        name: 'input',
        args: [handleValue(block, 'TEXT')],
      });

      if (block.getFieldValue('TYPE') === 'NUMBER') {
        input = buildNode('call', block, {
          name: 'num',
          args: [input],
        });
      }

      return input;
    },

    text_print(block) {
      const text = handleValue(block, 'TEXT');

      return buildNode('call', block, {
        name: 'print',
        args: text ? [text] : [],
      });
    },

    // time

    time_sleep(block) {
      return buildNode('call', block, {
        name: 'sleep',
        args: [handleValue(block, 'SECONDS')],
      });
    },

    time_create_empty(block) {
      return buildNode('call', block, {
        name: 'time',
        args: [],
      });
    },

    time_create_with(block) {
      return buildNode('call', block, {
        name: 'time',
        args: [
          handleValue(block, 'YEAR'),
          handleValue(block, 'MONTH'),
          handleValue(block, 'DAY'),
          handleValue(block, 'HOUR'),
          handleValue(block, 'MINUTE'),
          handleValue(block, 'SECOND'),
        ],
      });
    },

    time_getPart(block) {
      return buildNode('call', block, {
        name: 'part',
        args: [
          handleValue(block, 'TIME'),
          wrapLiteral(block.getFieldValue('UNIT').toLowerCase(), block),
        ],
      });
    },

    time_addSubtract(block) {
      const mode = block.getFieldValue('MODE').toLowerCase();

      return buildNode('call', block, {
        name: mode,
        args: [
          handleValue(block, 'TIME'),
          handleValue(block, 'VALUE'),
          wrapLiteral(block.getFieldValue('UNIT').toLowerCase(), block),
        ],
      });
    },

    time_startEnd(block) {
      const mode = block.getFieldValue('MODE').toLowerCase();

      return buildNode('call', block, {
        name: `${mode}of`,
        args: [
          handleValue(block, 'TIME'),
          wrapLiteral(block.getFieldValue('UNIT').toLowerCase(), block),
        ],
      });
    },

    time_diff(block) {
      return buildNode('call', block, {
        name: 'diff',
        args: [
          handleValue(block, 'TIME1'),
          handleValue(block, 'TIME2'),
          wrapLiteral(block.getFieldValue('UNIT').toLowerCase(), block),
        ],
      });
    },

    // lists

    lists_create_empty(block) {
      return buildNode('call', block, {
        name: 'list',
        args: [],
      });
    },

    lists_create_with(block) {
      const args = [];

      for (let i = 0; i < block.itemCount_; ++i) {
        args[i] = handleValue(block, `ADD${i}`) || wrapLiteral(null, block);
      }

      return buildNode('call', block, {
        name: 'list',
        args: args,
      });
    },

    lists_length(block) {
      return buildNode('call', block, {
        name: 'len',
        args: [handleValue(block, 'VALUE')],
      });
    },

    lists_isEmpty(block) {
      return buildNode('binaryOp', block, {
        op: '=',
        left: nodes.lists_length(block),
        right: wrapLiteral(0, block),
      });
    },

    lists_functions(block) {
      const OPERATORS = {
        SUM: 'sum',
        MIN: 'min',
        MAX: 'max',
        AVERAGE: 'avg',
      };

      return buildNode('call', block, {
        name: OPERATORS[block.getFieldValue('OP')],
        args: [handleValue(block, 'LIST')],
      });
    },

    lists_transformers(block) {
      let op = block.getFieldValue('OP');
      const order = block.getFieldValue('ORDER');

      if (op === 'SORT' && order === 'DESC') {
        op = 'rsort';
      } else {
        op = op.toLowerCase();
      }

      return buildNode('call', block, {
        name: op,
        args: [handleValue(block, 'LIST')],
      });
    },

    lists_indexOf(block) {
      const mode = block.getFieldValue('END').toLowerCase();

      return buildNode('call', block, {
        name: mode,
        args: [handleValue(block, 'VALUE'), handleValue(block, 'FIND')],
      });
    },

    lists_getIndex(block) {
      const mode = block.getFieldValue('MODE');
      let val = handleValue(block, 'VALUE');

      if (mode === 'REMOVE' && val.type !== 'var') {
        // removing from a temporary does nothing
        return;
      }

      const pos = getPosition(val, block);

      switch (mode) {
        case 'GET':
          if (val.type !== 'var') {
            // get a temporary so we can index it
            val = makeTemporary(val, block, 'list');
          }
          return buildNode('index', block, {
            name: val.name,
            indexes: [pos],
          });

        case 'GET_REMOVE':
        case 'REMOVE':
          return buildNode('call', block, {
            name: 'remove',
            args: [val, pos],
          });
      }
    },

    lists_setIndex(block) {
      const mode = block.getFieldValue('MODE');
      const val = handleValue(block, 'LIST');

      if (val.type !== 'var') {
        // changing a temporary has no effect
        return;
      }

      const pos = getPosition(val, block);
      const to = handleValue(block, 'TO');

      switch (mode) {
        case 'SET':
          return buildNode('letIndex', block, {
            name: val.name,
            indexes: [pos],
            value: to,
          });

        case 'INSERT':
          return buildNode('call', block, {
            name: 'insert',
            args: [val, pos, to],
          });
      }
    },

    lists_getSublist(block) {
      let val = handleValue(block, 'LIST');

      if (val.type !== 'var') {
        val = makeTemporary(val, block, 'list');
      }

      return buildNode('call', block, {
        name: 'copy',
        args: [val, getPosition(val, block, '1'), getPosition(val, block, '2')],
      });
    },

    lists_split(block) {
      const mode = block.getFieldValue('MODE');

      switch (mode) {
        case 'SPLIT':
          return buildNode('call', block, {
            name: 'split',
            args: [handleValue(block, 'INPUT'), handleValue(block, 'DELIM')],
          });
        case 'JOIN':
          return buildNode('call', block, {
            name: 'join',
            args: [handleValue(block, 'INPUT'), handleValue(block, 'DELIM')],
          });
      }
    },

    // tables

    tables_create_empty(block) {
      return buildNode('call', block, {
        name: 'table',
        args: [],
      });
    },

    tables_create_with(block) {
      const args = [];

      for (let i = 0; i < block.itemCount_; ++i) {
        args.push(wrapLiteral(block.getFieldValue(`KEY${i}`), block));
        args.push(handleValue(block, `VALUE${i}`) || wrapLiteral(null, block));
      }

      return buildNode('call', block, {
        name: 'table',
        args: args,
      });
    },

    tables_size(block) {
      return buildNode('call', block, {
        name: 'len',
        args: [handleValue(block, 'VALUE')],
      });
    },

    tables_isEmpty(block) {
      return buildNode('binaryOp', block, {
        op: '=',
        left: nodes.tables_size(block),
        right: wrapLiteral(0, block),
      });
    },

    tables_getIndex(block) {
      const mode = block.getFieldValue('MODE');
      let val = handleValue(block, 'VALUE');

      if (mode === 'REMOVE' && val.type !== 'var') {
        // removing from a temporary has no effect
        return;
      }

      const at = handleValue(block, 'AT');

      switch (mode) {
        case 'GET':
          if (val.type !== 'var') {
            // get a temporary so we can index it
            val = makeTemporary(val, block, 'table');
          }
          return buildNode('index', block, {
            name: val.name,
            indexes: [at],
          });

        case 'GET_REMOVE':
        case 'REMOVE':
          return buildNode('call', block, {
            name: 'remove',
            args: [val, at],
          });
      }
    },

    tables_setIndex(block) {
      const val = handleValue(block, 'TABLE');

      if (val.type !== 'var') {
        // changing a temporary has no effect
        return;
      }

      const at = handleValue(block, 'AT');
      const to = handleValue(block, 'TO');

      return buildNode('letIndex', block, {
        name: val.name,
        indexes: [at],
        value: to,
      });
    },

    tables_keys(block) {
      return buildNode('call', block, {
        name: 'keys',
        args: [handleValue(block, 'VALUE')],
      });
    },

    // graphics

    colour_picker(block) {
      return wrapLiteral(block.getFieldValue('COLOUR'));
    },

    colour_random(block) {
      const rand = buildNode('call', block, {
        name: 'rand',
        args: [],
      });

      return buildNode('call', block, {
        name: 'color',
        args: [rand, rand, rand],
      });
    },

    colour_rgb(block) {
      const convert = (val) => {
        if (val.type === 'literal') {
          val.value /= 100;
          return val;
        } else {
          return buildNode('binaryOp', block, {
            op: '/',
            left: val,
            right: wrapLiteral(100, block),
          });
        }
      };

      return buildNode('call', block, {
        name: 'color',
        args: [
          convert(handleValue(block, 'RED')),
          convert(handleValue(block, 'GREEN')),
          convert(handleValue(block, 'BLUE')),
        ],
      });
    },

    graphics_rect(block) {
      return buildNode('call', block, {
        name: 'rect',
        args: [
          handleValue(block, 'X'),
          handleValue(block, 'Y'),
          handleValue(block, 'WIDTH'),
          handleValue(block, 'HEIGHT'),
        ],
      });
    },

    graphics_circle(block) {
      return buildNode('call', block, {
        name: 'circle',
        args: [
          handleValue(block, 'X'),
          handleValue(block, 'Y'),
          handleValue(block, 'RADIUS'),
        ],
      });
    },

    graphics_ellipse(block) {
      return buildNode('call', block, {
        name: 'ellipse',
        args: [
          handleValue(block, 'X'),
          handleValue(block, 'Y'),
          handleValue(block, 'XRADIUS'),
          handleValue(block, 'YRADIUS'),
        ],
      });
    },

    graphics_line(block) {
      return buildNode('call', block, {
        name: 'line',
        args: [
          handleValue(block, 'X1'),
          handleValue(block, 'Y1'),
          handleValue(block, 'X2'),
          handleValue(block, 'Y2'),
        ],
      });
    },

    graphics_text(block) {
      return buildNode('call', block, {
        name: 'text',
        args: [
          handleValue(block, 'X'),
          handleValue(block, 'Y'),
          handleValue(block, 'TEXT'),
        ],
      });
    },

    graphics_stroke(block) {
      return buildNode('call', block, {
        name: 'stroke',
        args: [handleValue(block, 'COLOR')],
      });
    },

    graphics_fill(block) {
      return buildNode('call', block, {
        name: 'fill',
        args: [handleValue(block, 'COLOR')],
      });
    },

    graphics_opacity(block) {
      return buildNode('call', block, {
        name: 'opacity',
        args: [handleValue(block, 'AMOUNT')],
      });
    },

    graphics_rotate(block) {
      return buildNode('call', block, {
        name: 'rotate',
        args: [handleValue(block, 'ANGLE')],
      });
    },

    graphics_scale(block) {
      return buildNode('call', block, {
        name: 'scale',
        args: [handleValue(block, 'MULTX'), handleValue(block, 'MULTY')],
      });
    },

    graphics_font(block) {
      const fonts = {
        ARIAL: 'Arial',
        COURIER_NEW: 'Courier New',
        HELVETICA: 'Helvetica',
        TIMES_NEW_ROMAN: 'Times New Roman',
        VERDANA: 'Verdana',
      };

      return buildNode('call', block, {
        name: 'font',
        args: [
          wrapLiteral(fonts[block.getFieldValue('FAMILY')]),
          handleValue(block, 'SIZE'),
        ],
      });
    },

    graphics_repaint(block) {
      return buildNode('call', block, {
        name: 'repaint',
        args: [],
      });
    },

    // variables

    variables_get(block) {
      return buildNode('var', block, {
        name: block.getFieldValue('VAR'),
      });
    },

    variables_set(block) {
      return buildNode('const', block, {
        name: block.getFieldValue('VAR'),
        value: handleValue(block, 'VALUE'),
      });
    },

    // functions

    procedures_defnoreturn(block) {
      const [name, params] = block.getProcedureDef();
      const body = handleStatements(block, 'STACK');

      return buildNode('begin', block, { name, params, body });
    },

    procedures_defreturn(block) {
      const [name, params] = block.getProcedureDef();
      const result = handleValue(block, 'RETURN');
      let body = block.hasStatements_ && handleStatements(block, 'STACK');
      const ret = buildNode('return', block, { result });

      if (!body) {
        body = buildNode('block', block, { elems: [ret] });
      } else if (body.type !== 'block') {
        body = buildNode('block', block, { elems: [body, ret] });
      } else {
        body.elems.push(ret);
      }

      return buildNode('begin', block, { name, params, body });
    },

    procedures_callnoreturn(block) {
      const args = [];

      for (let i = 0; i < block.arguments_.length; ++i) {
        args.push(handleValue(block, `ARG${i}`));
      }

      return buildNode('call', block, {
        name: block.getFieldValue('NAME'),
        args,
      });
    },

    procedures_callreturn(block) {
      return nodes.procedures_callnoreturn(block);
    },

    procedures_ifreturn(block) {
      return buildNode('if', block, {
        cond: handleValue(block, 'CONDITION'),
        tbody: buildNode('return', block, {
          result: block.hasReturnValue_ ? handleValue(block, 'VALUE') : null,
        }),
      });
    },
  };

  return {
    fromWorkspace,
  };
}
