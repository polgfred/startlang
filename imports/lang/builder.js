'use strict';

let flowMarker = {
  'repeat': 'loop',
  'for': 'loop',
  'forIn': 'loop',
  'while': 'loop',
  'call': 'call'
};

function buildNode(type, block, attrs) {
  // if we're a block with one statement, just return the statement itself
  if (type == 'block' && attrs.elems.length == 1) {
    return attrs.elems[0];
  }

  // show the type first
  let node = { type };

  // then the flow marker
  if (flowMarker[type]) {
    node.flow = flowMarker[type];
  }

  // then the passed-in attributes
  Object.assign(node, attrs);

  return node;
}

function wrapLiteral(value, block) {
  // if it's already a node, pass it through
  return value != null && value.type != null ?
            value :
            buildNode('literal', block, { value });
}

export class SBuilder {
  constructor() {
    // keep track of nested statement blocks so we can inject setup
    // code as necessary
    this.blocks = [];
    this.temps = {};
  }

  fromWorkspace(ws) {
    // build a program tree from the blockly workspace
    let blocks = ws.getTopBlocks(true), funcs = [], elems = [];

    for (let i = 0; i < blocks.length; ++i) {
      let stmt = this.handleStatements(blocks[i]);

      if (stmt.type == 'begin') {
        // collect functions into their own list
        funcs.push(stmt);
      } else if (stmt.type == 'block') {
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

  handleValue(block, name) {
    // just dispatch on block type
    let target = name ? block.getInputTargetBlock(name) : block;
    return target && this[target.type](target);
  }

  handleStatements(block, name) {
    let elems = [];

    // push the current statement block onto the stack
    this.blocks.push(elems);

    try {
      // just dispatch on block type
      let target = name ? block.getInputTargetBlock(name) : block;

      while (target) {
        let stmt = this[target.type](target);
        // if we get nothing back, don't create a statement
        if (stmt) {
          elems.push(stmt);
        }
        // statement blocks are chained together
        target = target.nextConnection && target.nextConnection.targetBlock();
      }
    } finally {
      this.blocks.pop();
    }

    // if there was only one, just return the first, otherwise
    // wrap it in a block node
    return elems.length == 1 ?
      elems[0] :
      buildNode('block', block, { elems });
  }

  makeTemporary(value, block, prefix) {
    // get next available temp var with this prefix and make an assignment
    let count = this.temps[prefix] = (this.temps[prefix] || 0) + 1,
        name = `temp_${prefix}_${count}`;

    let elem = buildNode('let', block, { name, value });

    // append it to the nearest statements block
    this.blocks[this.blocks.length - 1].push(elem);

    // return a var node for the temporary
    return buildNode('var', block, { name });
  }

  getPosition(val, block, suffix) {
    // - assumes val is a var node -- caller should ensure that makeTemporary
    //   is called if it might be an arbitrary value expression
    // - assumes val can have len() called on it (a string or list)
    suffix = suffix || '';
    let where = block.getFieldValue(`WHERE${suffix}`);
    let at = this.handleValue(block, `AT${suffix}`);

    // we'll need this in a couple places
    let len = buildNode('call', block, {
      name: 'len',
      args: [ val ]
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
        if (at.type == 'literal') {
          // we can subtract up front
          --at.value;
          if (at.value == 0) {
            // at is 0, so len is already what we need
            return len;
          } else {
            // len - at
            return buildNode('binaryOp', block, {
              name: '-',
              args: [ len, at ]
            });
          }
        } else {
          // have to emit code to adjust the result by 1
          return buildNode('binaryOp', block, {
            op: '+',
            left: buildNode('binaryOp', block, {
              name: '-',
              args: [ len, at ]
            }),
            right: wrapLiteral(1, block)
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
              args: [ val ]
            })
          ]
        });
    }
  }

  // control

  control_exit(block) {
    return buildNode('exit', block);
  }

  // loops

  controls_repeat_ext(block) {
    return buildNode('repeat', block, {
      times: this.handleValue(block, 'TIMES'),
      body: this.handleStatements(block, 'DO')
    });
  }

  controls_whileUntil(block) {
    let cond = this.handleValue(block, 'BOOL');

    if (block.getFieldValue('MODE') == 'UNTIL') {
      // reverse the condition
      cond = buildNode('logicalOp', block, {
        op: 'not',
        right: cond
      });
    }

    return buildNode('while', block, {
      cond: cond,
      body: this.handleStatements(block, 'DO')
    });
  }

  controls_for(block) {
    return buildNode('for', block, {
      name: block.getFieldValue('VAR'),
      from: this.handleValue(block, 'FROM'),
      to: this.handleValue(block, 'TO'),
      by: this.handleValue(block, 'BY'),
      body: this.handleStatements(block, 'DO')
    });
  }

  controls_forEach(block) {
    return buildNode('forIn', block, {
      name: block.getFieldValue('VAR'),
      range: this.handleValue(block, 'LIST'),
      body: this.handleStatements(block, 'DO')
    });
  }

  controls_flow_statements(block) {
    let FLOWS = {
      'BREAK':   'break',
      'CONTINUE': 'next'
    };

    return buildNode(FLOWS[block.getFieldValue('FLOW')], block);
  }

  // logic

  controls_if(block) {
    // the top-level if block
    let top = buildNode('if', block, {
      cond: this.handleValue(block, 'IF0'),
      tbody: this.handleStatements(block, 'DO0')
    });

    let current = top;

    for (let i = 1; i <= block.elseifCount_; ++i) {
      // create a nested if block inside the else block
      current.fbody = buildNode('if', block, {
        cond: this.handleValue(block, `IF${i}`),
        tbody: this.handleStatements(block, `DO${i}`)
      });

      current = current.fbody;
    }

    if (block.elseCount_) {
      // create the final else block
      current.fbody = this.handleStatements(block, 'ELSE');
    }

    return top;
  }

  logic_compare(block) {
    let OPERATORS = {
      'EQ':   '=',
      'NEQ':  '!=',
      'LT':   '<',
      'LTE':  '<=',
      'GT':   '>',
      'GTE':  '>='
    };

    return buildNode('binaryOp', block, {
      op: OPERATORS[block.getFieldValue('OP')],
      left: this.handleValue(block, 'A'),
      right: this.handleValue(block, 'B')
    });
  }

  logic_operation(block) {
    return buildNode('logicalOp', block, {
      op: block.getFieldValue('OP').toLowerCase(),
      left: this.handleValue(block, 'A'),
      right: this.handleValue(block, 'B')
    });
  }

  logic_negate(block) {
    return buildNode('logicalOp', block, {
      op: 'not',
      right: this.handleValue(block, 'BOOL')
    });
  }

  logic_boolean(block) {
    return wrapLiteral(block.getFieldValue('BOOL') == 'TRUE', block);
  }

  logic_null(block) {
    return wrapLiteral(null, block);
  }

  // math

  math_number(block) {
    return wrapLiteral(parseFloat(block.getFieldValue('NUM')), block);
  }

  math_angle(block) {
    return wrapLiteral(parseFloat(block.getFieldValue('ANGLE')), block);
  }

  math_arithmetic(block) {
    let OPERATORS = {
      'ADD':      '+',
      'MINUS':    '-',
      'MULTIPLY': '*',
      'DIVIDE':   '/'
    };

    let op = block.getFieldValue('OP');

    if (op == 'POWER') {
      return buildNode('call', block, {
        name: 'exp',
        args: [
          this.handleValue(block, 'A'),
          this.handleValue(block, 'B')
        ]
      });
    } else {
      return buildNode('binaryOp', block, {
        op: OPERATORS[op],
        left: this.handleValue(block, 'A'),
        right: this.handleValue(block, 'B')
      });
    }
  }

  math_single(block) {
    let FUNCS = {
      'ROOT':       'sqrt',
      'LN':         'log',
      'ROUNDUP':    'ceil',
      'ROUNDDOWN':  'floor'
    }

    let func = block.getFieldValue('OP');
    let num = this.handleValue(block, 'NUM');

    switch (func) {
      case 'NEG':
        return buildNode('unaryOp', block, {
          op: '-',
          right: num
        });
      case 'LOG10':
        return buildNode('call', block, {
          name: 'log',
          args: [ wrapLiteral(10, block), num ]
        });
      case 'POW10':
        return buildNode('call', block, {
          name: 'exp',
          args: [ wrapLiteral(10, block), num ]
        });
      default:
        return buildNode('call', block, {
          name: FUNCS[func] || func.toLowerCase(),
          args: [ num ]
        });
    }
  }

  math_round(block) {
    return this.math_single(block);
  }

  math_trig(block) {
    return this.math_single(block);
  }

  math_number_property(block) {
    let prop = block.getFieldValue('PROPERTY');
    let num = this.handleValue(block, 'NUMBER_TO_CHECK');

    // construct an 'x % y == z' test
    function buildModTest(denom, test) {
      return buildNode('binaryOp', block, {
        op: '=',
        left: buildNode('binaryOp', block, {
          op: '%',
          left: num,
          right: wrapLiteral(denom, block)
        }),
        right: wrapLiteral(test, block)
      });
    }

    // construct an 'x >/< 0' test
    function buildLGTest(op) {
      return buildNode('binaryOp', block, {
        op: op,
        left: num,
        right: wrapLiteral(0, block)
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
        return buildModTest(this.handleValue(block, 'DIVISOR'), 0);
      case 'POSITIVE':
        return buildLGTest('>');
      case 'NEGATIVE':
        return buildLGTest('<');
    }
  }

  math_change(block) {
    let name = block.getFieldValue('VAR');
    let delta = this.handleValue(block, 'DELTA');
    let sign = '+';

    if (delta.type == 'literal' && delta.value < 0) {
      // if delta is a literal negative number, be nice and build
      // a minus expression
      delta.value = -delta.value;
      sign = '-';
    }

    return buildNode('let', block, {
      name: name,
      value: buildNode('binaryOp', block, {
        op: sign,
        left: buildNode('var', block, {
          name: name
        }),
        right: delta
      })
    });
  }

  math_modulo(block) {
    return buildNode('binaryOp', block, {
      op: '%',
      left: this.handleValue(block, 'DIVIDEND'),
      right: this.handleValue(block, 'DIVISOR')
    });
  }

  math_constrain(block) {
    let valueOrDefault =
      (name, default_) => this.handleValue(block, name) || wrapLiteral(default_);

    return buildNode('call', block, {
      name: 'clamp',
      args: [
        this.handleValue(block, 'VALUE'),
        valueOrDefault('LOW', 0),
        valueOrDefault('HIGH', Infinity)
      ]
    });
  }

  math_random_int(block) {
    return buildNode('call', block, {
      name: 'rand',
      args: [
        this.handleValue(block, 'FROM'),
        this.handleValue(block, 'TO')
      ]
    });
  }

  math_random_float(block) {
    return buildNode('call', block, {
      name: 'rand',
      args: []
    });
  }

  // text

  text(block) {
    return wrapLiteral(block.getFieldValue('TEXT'), block);
  }

  text_join(block) {
    let str = this.handleValue(block, 'ADD0');

    if (!(str.type == 'literal' && typeof str.value == 'string')) {
      str = buildNode('binaryOp', block, {
        op: '$',
        left: wrapLiteral('', block),
        right: str
      });
    }

    for (let i = 1; i < block.itemCount_; ++i) {
      str = buildNode('binaryOp', block, {
        op: '$',
        left: str,
        right: this.handleValue(block, `ADD${i}`)
      });
    }

    return str;
  }

  text_append(block) {
    let name = block.getFieldValue('VAR');

    return buildNode('let', block, {
      name: name,
      value: buildNode('binaryOp', block, {
        op: '$',
        left: buildNode('var', block, {
          name: name,
        }),
        right: this.handleValue(block, 'TEXT')
      })
    });
  }

  text_length(block) {
    return buildNode('call', block, {
      name: 'len',
      args: [ this.handleValue(block, 'VALUE') ]
    });
  }

  text_isEmpty(block) {
    return buildNode('binaryOp', block, {
      op: '=',
      left: this.text_length(block),
      right: wrapLiteral(0, block)
    });
  }

  text_indexOf(block) {
    let mode = block.getFieldValue('END').toLowerCase();

    return buildNode('call', block, {
      name: mode,
      args: [
        this.handleValue(block, 'VALUE'),
        this.handleValue(block, 'FIND')
      ]
    });
  }

  text_charAt(block) {
    let val = this.handleValue(block, 'VALUE');

    if (val.type != 'var') {
      val = this.makeTemporary(val, block, 'string');
    }

    return buildNode('index', block, {
      name: val.name,
      indexes: [ this.getPosition(val, block) ]
    });
  }

  text_getSubstring(block) {
    let val = this.handleValue(block, 'STRING');

    if (val.type != 'literal' && val.type != 'var') {
      val = this.makeTemporary(val, block, 'string');
    }

    return buildNode('call', block, {
      name: 'copy',
      args: [
        val,
        this.getPosition(val, block, '1'),
        this.getPosition(val, block, '2')
      ]
    });
  }

  text_changeCase(block) {
    let CASES = {
      'UPPERCASE': 'upper',
      'LOWERCASE': 'lower',
      'TITLECASE': 'title'
    };

    return buildNode('call', block, {
      name: CASES[block.getFieldValue('CASE')],
      args: [ this.handleValue(block, 'TEXT') ]
    });
  }

  text_trim(block) {
    let TRIMS = {
      'LEFT':   'ltrim',
      'RIGHT':  'rtrim',
      'BOTH':   'trim'
    };

    return buildNode('call', block, {
      name: TRIMS[block.getFieldValue('MODE')],
      args: [ this.handleValue(block, 'TEXT') ]
    });
  }

  text_prompt_ext(block) {
    let input = buildNode('call', block, {
      name: 'input',
      args: [ this.handleValue(block, 'TEXT') ]
    });

    if (block.getFieldValue('TYPE') == 'NUMBER') {
      input = buildNode('call', block, {
        name: 'num',
        args: [ input ]
      });
    }

    return input;
  }

  text_print(block) {
    let text = this.handleValue(block, 'TEXT');

    return buildNode('call', block, {
      name: 'print',
      args: text ? [ text ] : []
    });
  }

  // time

  time_sleep(block) {
    return buildNode('call', block, {
      name: 'sleep',
      args: [ this.handleValue(block, 'SECONDS') ]
    });
  }

  // time

  time_sleep(block) {
    return buildNode('call', block, {
      name: 'sleep',
      args: [ this.handleValue(block, 'SECONDS') ]
    });
  }

  time_create_empty(block) {
    return buildNode('call', block, {
      name: 'time',
      args: []
    });
  }

  time_create_with(block) {
    return buildNode('call', block, {
      name: 'time',
      args: [
        this.handleValue(block, 'YEAR'),
        this.handleValue(block, 'MONTH'),
        this.handleValue(block, 'DAY'),
        this.handleValue(block, 'HOUR'),
        this.handleValue(block, 'MINUTE'),
        this.handleValue(block, 'SECOND')
      ]
    });
  }

  time_getPart(block) {
    return buildNode('call', block, {
      name: 'part',
      args: [
        this.handleValue(block, 'TIME'),
        wrapLiteral(block.getFieldValue('UNIT').toLowerCase(), block)
      ]
    });
  }

  time_addSubtract(block) {
    let mode = block.getFieldValue('MODE').toLowerCase();

    return buildNode('call', block, {
      name: mode,
      args: [
        this.handleValue(block, 'TIME'),
        this.handleValue(block, 'VALUE'),
        wrapLiteral(block.getFieldValue('UNIT').toLowerCase(), block)
      ]
    });
  }

  time_startEnd(block) {
    let mode = block.getFieldValue('MODE').toLowerCase();

    return buildNode('call', block, {
      name: `${mode}of`,
      args: [
        this.handleValue(block, 'TIME'),
        wrapLiteral(block.getFieldValue('UNIT').toLowerCase(), block)
      ]
    });
  }

  time_diff(block) {
    return buildNode('call', block, {
      name: 'diff',
      args: [
        this.handleValue(block, 'TIME1'),
        this.handleValue(block, 'TIME2'),
        wrapLiteral(block.getFieldValue('UNIT').toLowerCase(), block)
      ]
    });
  }

  // lists

  lists_create_empty(block) {
    return buildNode('call', block, {
      name: 'list',
      args: []
    });
  }

  lists_create_with(block) {
    let args = [];

    for (let i = 0; i < block.itemCount_; ++i) {
      args[i] = this.handleValue(block, `ADD${i}`) || wrapLiteral(null, block);
    }

    return buildNode('call', block, {
      name: 'list',
      args: args
    });
  }

  lists_length(block) {
    return buildNode('call', block, {
      name: 'len',
      args: [ this.handleValue(block, 'VALUE') ]
    });
  }

  lists_isEmpty(block) {
    return buildNode('binaryOp', block, {
      op: '=',
      left: this.lists_length(block),
      right: wrapLiteral(0, block)
    });
  }

  lists_functions(block) {
    let OPERATORS = {
      'SUM': 'sum',
      'MIN': 'min',
      'MAX': 'max',
      'AVERAGE': 'avg'
    };

    return buildNode('call', block, {
      name: OPERATORS[block.getFieldValue('OP')],
      args: [ this.handleValue(block, 'LIST') ]
    });
  }

  lists_transformers(block) {
    let op = block.getFieldValue('OP');
    let order = block.getFieldValue('ORDER');

    if (op == 'SORT' && order == 'DESC') {
      op = 'rsort';
    } else {
      op = op.toLowerCase();
    }

    return buildNode('call', block, {
      name: op,
      args: [ this.handleValue(block, 'LIST') ]
    });
  }

  lists_indexOf(block) {
    let mode = block.getFieldValue('END').toLowerCase();

    return buildNode('call', block, {
      name: mode,
      args: [
        this.handleValue(block, 'VALUE'),
        this.handleValue(block, 'FIND')
      ]
    });
  }

  lists_getIndex(block) {
    let mode = block.getFieldValue('MODE');
    let val = this.handleValue(block, 'VALUE');

    if (mode == 'REMOVE' && val.type != 'var') {
      // removing from a temporary does nothing
      return;
    }

    let pos = this.getPosition(val, block);

    switch (mode) {
      case 'GET':
        if (val.type != 'var') {
          // get a temporary so we can index it
          val = this.makeTemporary(val, block, 'list');
        }
        return buildNode('index', block, {
          name: val.name,
          indexes: [ pos ]
        });

      case 'GET_REMOVE':
      case 'REMOVE':
        return buildNode('call', block, {
          name: 'remove',
          args: [ val, pos ]
        });
    }
  }

  lists_setIndex(block) {
    let mode = block.getFieldValue('MODE');
    let val = this.handleValue(block, 'LIST');

    if (val.type != 'var') {
      // changing a temporary has no effect
      return;
    }

    let pos = this.getPosition(val, block);
    let to = this.handleValue(block, 'TO');

    switch (mode) {
      case 'SET':
        return buildNode('letIndex', block, {
          name: val.name,
          indexes: [ pos ],
          value: to
        });

      case 'INSERT':
        return buildNode('call', block, {
          name: 'insert',
          args: [ val, pos, to ]
        });
    }
  }

  lists_getSublist(block) {
    let val = this.handleValue(block, 'LIST');

    if (val.type != 'var') {
      val = this.makeTemporary(val, block, 'list');
    }

    return buildNode('call', block, {
      name: 'copy',
      args: [
        val,
        this.getPosition(val, block, '1'),
        this.getPosition(val, block, '2')
      ]
    });
  }

  lists_split(block) {
    let mode = block.getFieldValue('MODE');

    switch (mode) {
      case 'SPLIT':
        return buildNode('call', block, {
          name: 'split',
          args: [
            this.handleValue(block, 'INPUT'),
            this.handleValue(block, 'DELIM')
          ]
        });
      case 'JOIN':
        return buildNode('call', block, {
          name: 'join',
          args: [
            this.handleValue(block, 'INPUT'),
            this.handleValue(block, 'DELIM')
          ]
        });
    }
  }

  // tables

  tables_create_empty(block) {
    return buildNode('call', block, {
      name: 'table',
      args: []
    });
  }

  tables_create_with(block) {
    let args = [];

    for (let i = 0; i < block.itemCount_; ++i) {
      args.push(wrapLiteral(block.getFieldValue(`KEY${i}`), block));
      args.push(this.handleValue(block, `VALUE${i}`) || wrapLiteral(null, block));
    }

    return buildNode('call', block, {
      name: 'table',
      args: args
    });
  }

  tables_size(block) {
    return buildNode('call', block, {
      name: 'len',
      args: [ this.handleValue(block, 'VALUE') ]
    });
  }

  tables_isEmpty(block) {
    return buildNode('binaryOp', block, {
      op: '=',
      left: this.tables_size(block),
      right: wrapLiteral(0, block)
    });
  }

  tables_getIndex(block) {
    let mode = block.getFieldValue('MODE');
    let val = this.handleValue(block, 'VALUE');

    if (mode == 'REMOVE' && val.type != 'var') {
      // removing from a temporary has no effect
      return;
    }

    let at = this.handleValue(block, 'AT');

    switch (mode) {
      case 'GET':
        if (val.type != 'var') {
          // get a temporary so we can index it
          val = this.makeTemporary(val, block, 'table');
        }
        return buildNode('index', block, {
          name: val.name,
          indexes: [ at ]
        });

      case 'GET_REMOVE':
      case 'REMOVE':
        return buildNode('call', block, {
          name: 'remove',
          args: [ val, at ]
        });
    }
  }

  tables_setIndex(block) {
    let val = this.handleValue(block, 'TABLE');

    if (val.type != 'var') {
      // changing a temporary has no effect
      return;
    }

    let at = this.handleValue(block, 'AT');
    let to = this.handleValue(block, 'TO');

    return buildNode('letIndex', block, {
      name: val.name,
      indexes: [ at ],
      value: to
    });
  }

  tables_keys(block) {
    return buildNode('call', block, {
      name: 'keys',
      args: [ this.handleValue(block, 'VALUE') ]
    });
  }

  // graphics

  colour_picker(block) {
    return wrapLiteral(block.getFieldValue('COLOUR'));
  }

  colour_random(block) {
    let rand = buildNode('call', block, {
      name: 'rand',
      args: []
    });

    return buildNode('call', block, {
      name: 'color',
      args: [ rand, rand, rand ]
    });
  }

  colour_rgb(block) {
    let convert = (val) => {
      if (val.type == 'literal') {
        val.value /= 100;
        return val;
      } else {
        return buildNode('binaryOp', block, {
          op: '/',
          left: val,
          right: wrapLiteral(100, block)
        });
      }
    };

    return buildNode('call', block, {
      name: 'color',
      args: [
        convert(this.handleValue(block, 'RED')),
        convert(this.handleValue(block, 'GREEN')),
        convert(this.handleValue(block, 'BLUE'))
      ]
    });
  }

  graphics_rect(block) {
    return buildNode('call', block, {
      name: 'rect',
      args: [
        this.handleValue(block, 'X'),
        this.handleValue(block, 'Y'),
        this.handleValue(block, 'WIDTH'),
        this.handleValue(block, 'HEIGHT')
      ]
    });
  }

  graphics_circle(block) {
    return buildNode('call', block, {
      name: 'circle',
      args: [
        this.handleValue(block, 'X'),
        this.handleValue(block, 'Y'),
        this.handleValue(block, 'RADIUS')
      ]
    });
  }

  graphics_ellipse(block) {
    return buildNode('call', block, {
      name: 'ellipse',
      args: [
        this.handleValue(block, 'X'),
        this.handleValue(block, 'Y'),
        this.handleValue(block, 'XRADIUS'),
        this.handleValue(block, 'YRADIUS')
      ]
    });
  }

  graphics_line(block) {
    return buildNode('call', block, {
      name: 'line',
      args: [
        this.handleValue(block, 'X1'),
        this.handleValue(block, 'Y1'),
        this.handleValue(block, 'X2'),
        this.handleValue(block, 'Y2')
      ]
    });
  }

  graphics_text(block) {
    return buildNode('call', block, {
      name: 'text',
      args: [
        this.handleValue(block, 'X'),
        this.handleValue(block, 'Y'),
        this.handleValue(block, 'TEXT')
      ]
    });
  }

  graphics_stroke(block) {
    return buildNode('call', block, {
      name: 'stroke',
      args: [
        this.handleValue(block, 'COLOR')
      ]
    });
  }

  graphics_fill(block) {
    return buildNode('call', block, {
      name: 'fill',
      args: [
        this.handleValue(block, 'COLOR')
      ]
    });
  }

  graphics_opacity(block) {
    return buildNode('call', block, {
      name: 'opacity',
      args: [
        this.handleValue(block, 'AMOUNT')
      ]
    });
  }

  graphics_rotate(block) {
    return buildNode('call', block, {
      name: 'rotate',
      args: [
        this.handleValue(block, 'ANGLE')
      ]
    });
  }

  graphics_scale(block) {
    return buildNode('call', block, {
      name: 'scale',
      args: [
        this.handleValue(block, 'MULTX'),
        this.handleValue(block, 'MULTY')
      ]
    });
  }

  graphics_font(block) {
    let fonts = {
      'ARIAL': 'Arial',
      'COURIER_NEW': 'Courier New',
      'HELVETICA': 'Helvetica',
      'TIMES_NEW_ROMAN': 'Times New Roman',
      'VERDANA': 'Verdana'
    };

    return buildNode('call', block, {
      name: 'font',
      args: [
        wrapLiteral(fonts[block.getFieldValue('FAMILY')]),
        this.handleValue(block, 'SIZE')
      ]
    });
  }

  graphics_repaint(block) {
    return buildNode('call', block, {
      name: 'repaint',
      args: []
    });
  }

  // variables

  variables_get(block) {
    return buildNode('var', block, {
      name: block.getFieldValue('VAR')
    });
  }

  variables_set(block) {
    return buildNode('let', block, {
      name: block.getFieldValue('VAR'),
      value: this.handleValue(block, 'VALUE')
    });
  }

  // functions

  procedures_defnoreturn(block) {
    let [ name, params ] = block.getProcedureDef(),
        body = this.handleStatements(block, 'STACK');

    return buildNode('begin', block, { name, params, body });
  }

  procedures_defreturn(block) {
    let [ name, params ] = block.getProcedureDef(),
        result = this.handleValue(block, 'RETURN'),
        body = block.hasStatements_ && this.handleStatements(block, 'STACK'),
        ret = buildNode('return', block, { result });

    if (!body) {
      body = buildNode('block', block, { elems: [ ret ] });
    } else if (body.type != 'block') {
      body = buildNode('block', block, { elems: [ body, ret ] });
    } else {
      body.elems.push(ret);
    }

    return buildNode('begin', block, { name, params, body });
  }

  procedures_callnoreturn(block) {
    let args = [];

    for (let i = 0; i < block.arguments_.length; ++i) {
      args.push(this.handleValue(block, `ARG${i}`));
    }

    return buildNode('call', block, {
      name: block.getFieldValue('NAME'),
      args
    });
  }

  procedures_callreturn(block) {
    return this.procedures_callnoreturn(block);
  }

  procedures_ifreturn(block) {
    return buildNode('if', block, {
      cond: this.handleValue(block, 'CONDITION'),
      tbody: buildNode('return', block, {
        result: block.hasReturnValue_ ? this.handleValue(block, 'VALUE') : null
      })
    });
  }
}
