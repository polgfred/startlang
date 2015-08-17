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
  handleValue(block, name) {
    // just dispatch on block type
    let target = name ? block.getInputTargetBlock(name) : block;
    return target && this[target.type](target);
  }

  handleStatements(block, name) {
    let elems = [];
    let target = name ? block.getInputTargetBlock(name) : block;

    // statement blocks are chained together
    while (target) {
      elems.push(this[target.type](target));
      target = target.nextConnection && target.nextConnection.targetBlock();
    }

    // if there was more one, wrap it in a block node
    return elems.length == 1 ? elems[0] : buildNode('block', block, {
      elems: elems
    });
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

  controls_if0(block) {
    return buildNode('if', block, {
      cond: this.handleValue(block, 'IF'),
      tbody: this.handleStatements(block, 'DO')
    });
  }

  controls_if_else0(block) {
    return buildNode('if', block, {
      cond: this.handleValue(block, 'IF'),
      tbody: this.handleStatements(block, 'DO'),
      fbody: this.handleStatements(block, 'ELSE')
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
      'DIVIDE':   '/',
      'POWER':    '**'
    };

    return buildNode('binaryOp', block, {
      op: OPERATORS[block.getFieldValue('OP')],
      left: this.handleValue(block, 'A'),
      right: this.handleValue(block, 'B')
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
      args: [ this.handleValue(block, 'NUM') ]
    });

    //handle some oddball cases
    //case 'POW10':
    //case 'LOG10':
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

  // math_on_list(block) {
  //
  // }

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
      name: 'randrange',
      args: [
        this.handleValue(block, 'FROM'),
        this.handleValue(block, 'TO')
      ]
    });
  }

  math_random_float(block) {
    return buildNode('call', block, {
      name: 'random',
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

  text_getPosition(block, suffix) {
    suffix = suffix || '';
    let where = block.getFieldValue('WHERE' + suffix);
    let at = this.handleValue(block, 'AT' + suffix);

    switch (where) {
      case 'FIRST':
        return wrapLiteral(1, block);
      case 'LAST':
        return wrapLiteral(-1, block);
      case 'FROM_START':
        return at;
      case 'FROM_END':
        if (at.type == 'literal') {
          at.value = -at.value;
        } else {
          at = buildNode('unaryOp', block, {
            op: '-',
            right: at
          });
        }
        return at;
    }
  }

  text_charAt(block) {
    return buildNode('call', block, {
      name: 'chars',
      args: [
        this.handleValue(block, 'VALUE'),
        this.text_getPosition(block),
        wrapLiteral(1, block)
      ]
    });
  }

  text_getSubstring(block) {
    return buildNode('call', block, {
      name: 'copy',
      args: [
        this.handleValue(block, 'STRING'),
        this.text_getPosition(block, '1'),
        this.text_getPosition(block, '2')
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
  let root = new Astgen().handleValue(block);
  return JSON.stringify(root, null, 2);
};
