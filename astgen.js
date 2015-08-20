import Blockly from './blockly_wrapper';

function buildNode(type, block, attrs) {
  // if we're a block with one statement, just return the statement itself
  if (type == 'block' && attrs.elems.length == 1) {
    return attrs.elems[0];
  }

  var node = { type: type }; // block: block

  for (var p in attrs) {
    node[p] = attrs[p];
  }

  return node;
}

function wrapLiteral(val, block) {
  // if it's already a node, pass it through
  return val.type ? val : buildNode('literal', block, {
    value: val
  });
}

export default class Astgen {
  constructor() {
    // keep track of nested statement blocks so we can inject setup
    // code as necessary
    this.blocks = [];
    this.temps = {};
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
    return elems.length == 1 ? elems[0] : buildNode('block', block, {
      elems: elems
    });
  }

  makeTemporary(value, block, prefix) {
    // get next available temp var with this prefix
    let temp =  'temp_' + prefix + '_' +
                (this.temps[prefix] = (this.temps[prefix] || 0) + 1);

    // inject a let node into the closest available statements block
    let elem = buildNode('let', block, {
      name: temp,
      value: value
    });
    this.blocks[this.blocks.length - 1].push(elem);

    // return a var node for the temporary
    return buildNode('var', block, {
      name: temp
    });
  }

  getPosition(val, block, suffix) {
    // - assumes val is a var node -- caller should ensure that makeTemporary
    //   is called if it might be an arbitrary value expression
    // - assumes val can have len() called on it (a string or list)
    suffix = suffix || '';
    let where = block.getFieldValue('WHERE' + suffix);
    let at = this.handleValue(block, 'AT' + suffix);
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

  // loops

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
      range: buildNode('call', block, {
        name: 'range',
        args: [
          this.handleValue(block, 'FROM'),
          this.handleValue(block, 'TO'),
          this.handleValue(block, 'BY')
        ]
      }),
      body: this.handleStatements(block, 'DO')
    });
  }

  controls_forEach(block) {
    return buildNode('for', block, {
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
        cond: this.handleValue(block, 'IF' + i),
        tbody: this.handleStatements(block, 'DO' + i)
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
          this.handleValue(block, 'B'),
          this.handleValue(block, 'A')
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
          args: [ num, wrapLiteral(10, block) ]
        });
      case 'POW10':
        return buildNode('call', block, {
          name: 'exp',
          args: [ num, wrapLiteral(10, block) ]
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
    let valueOrDefault = (name, default_) => {
      return this.handleValue(block, name) || wrapLiteral(default_);
    };

    return buildNode('call', block, {
      name: 'constrain',
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
    let str = wrapLiteral(this.handleValue(block, 'ADD0'), block);

    for (let i = 1; i < block.itemCount_; ++i) {
      str = buildNode('binaryOp', block, {
        op: '$',
        left: str,
        right: wrapLiteral(this.handleValue(block, 'ADD' + i), block)
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

    if (val.type != 'literal' && val.type != 'var') {
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

  text_print(block) {
    let text = this.handleValue(block, 'TEXT');

    return buildNode('call', block, {
      name: 'print',
      args: text ? [ text ] : []
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
      args[i] = this.handleValue(block, 'ADD' + i);
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

    if (val.type != 'var') {
      if (mode == 'REMOVE') {
        // removing from a temporary does nothing
        return;
      } else {
        // we want the get but not the remove
        mode = 'GET';
      }

      // get a temporary so we can index it
      val = this.makeTemporary(val, block, 'list');
    }

    let pos = this.getPosition(val, block);

    switch (mode) {
      case 'GET':
        // simple index node
        return buildNode('index', block, {
          name: val.name,
          indexes: [ pos ]
        });

      case 'GET_REMOVE':
      case 'REMOVE':
        if (pos.type == 'literal') {
          return buildNode('call', block, {
            name: 'remove',
            args: [ val, pos, wrapLiteral(pos.value + 1, block) ]
          });
        } else {
          if (pos.type != 'var') {
            // get a temporary for the start position
            pos = this.makeTemporary(pos, block, 'pos');
          }
          return buildNode('call', block, {
            name: 'remove',
            args: [
              val,
              pos,
              buildNode('binaryOp', block, {
                op: '+',
                left: pos,
                right: wrapLiteral(1, block)
              })
            ]
          });
        }
    }
  }

  lists_setIndex(block) {
    let mode = block.getFieldValue('MODE');
    let val = this.handleValue(block, 'LIST');
    let to = this.handleValue(block, 'TO');

    if (val.type != 'var') {
      // changing a temporary does nothing
      return;
    }

    let pos = this.getPosition(val, block);

    switch (mode) {
      case 'SET':
        // simple letIndex node
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
}

global.runit = function() {
  let block = Blockly.getMainWorkspace().getTopBlocks()[0];
  let root = new Astgen().handleStatements(block);
  return JSON.stringify(root, null, 2);
};
