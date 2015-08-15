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
  // if it's already a literal, pass it through
  return val.type == 'literal' ? val : buildNode('literal', block, {
    value: val
  });
}

export default class Astgen {
  handleBlock(block, name) {
    // just dispatch on block type
    let target = name ? block.getInputTargetBlock(name) : block;
    return this[target.type](target);
  }

  // logic

  controls_if0(block) {
    return buildNode('if', block, {
      cond: this.handleBlock(block, 'IF'),
      tbody: this.handleBlock(block, 'DO')
    });
  }

  controls_if_else0(block) {
    return buildNode('if', block, {
      cond: this.handleBlock(block, 'IF'),
      tbody: this.handleBlock(block, 'DO'),
      fbody: this.handleBlock(block, 'ELSE')
    });
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
      left: this.handleBlock(block, 'A'),
      right: this.handleBlock(block, 'B')
    });
  }

  logic_operation(block) {
    return buildNode('logicalOp', block, {
      op: block.getFieldValue('OP').toLowerCase(),
      left: this.handleBlock(block, 'A'),
      right: this.handleBlock(block, 'B')
    });
  }

  logic_negate(block) {
    return buildNode('logicalOp', block, {
      op: 'not',
      right: this.handleBlock(block, 'BOOL')
    });
  }

  logic_boolean(block) {
    return buildNode('literal', block, {
      value: block.getFieldValue('BOOL') == 'TRUE' ? true : false
    });
  }

  logic_null(block) {
    return buildNode('literal', block, {
      value: null
    });
  }

  // math

  math_number(block) {
    return buildNode('literal', block, {
      value: parseFloat(block.getFieldValue('NUM'))
    });
  }

  math_arithmetic(block) {
    let OPERATORS = {
      'ADD':      '+',
      'MINUS':    '-',
      'MULTIPLY': '*',
      'DIVIDE':   '/',
      'POWER':    '**'
    };

    return buildNode('binaryOp', block, {
      op: OPERATORS[block.getFieldValue('OP')],
      left: this.handleBlock(block, 'A'),
      right: this.handleBlock(block, 'B')
    });
  }

  math_single(block) {
    let FUNCS = {
      'ROOT':       'sqrt',
      'LN':         'log',
      'ROUNDUP':    'ceil',
      'ROUNDDOWN':  'floor'
    }

    let func = block.getFieldValue('OP');
    return buildNode('call', block, {
      name: FUNCS[func] || func.toLowerCase(),
      args: [ this.handleBlock(block, 'NUM') ]
    });

    //handle some oddball cases
    //case 'POW10':
    //case 'LOG10':
  }

  math_trig(block) {
    return this.math_single(block);
  }

  math_number_property(block) {
    let prop = block.getFieldValue('PROPERTY');
    let num = this.handleBlock(block, 'NUMBER_TO_CHECK');

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
        return buildModTest(this.handleBlock(block, 'DIVISOR'), 0);
      case 'POSITIVE':
        return buildLGTest('>');
      case 'NEGATIVE':
        return buildLGTest('<');
    }
  }

  math_change(block) {
    let name = block.getFieldValue('VAR');
    let delta = this.handleBlock(block, 'DELTA');
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

  // variables

  variables_get(block) {
    return buildNode('var', block, {
      name: block.getFieldValue('VAR')
    });
  }

  variables_set(block) {
    return buildNode('let', block, {
      name: block.getFieldValue('VAR'),
      value: this.handleBlock(block, 'VALUE')
    });
  }
}

global.runit = function() {
  let block = Blockly.getMainWorkspace().getTopBlocks()[0];
  let root = new Astgen().handleBlock(block);
  return JSON.stringify(root, null, 2);
};
