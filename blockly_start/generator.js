'use strict';

import util from 'util';

let Blockly = require('node-blockly/lib/blockly_compressed');

Blockly.Start = util._extend(new Blockly.Generator('Start'), {
  // order of precedence
  LITERAL:      0,
  INDEX:        1,
  CALL:         2,
  UNARY_OP:     3,
  POW_OP:       4,
  MULT_OP:      5,
  ADD_OP:       6,
  BIT_OP:       7,
  CONCAT_OP:    8,
  REL_OP:       9,
  LOGICAL_NOT:  10,
  LOGICAL_OP:   11,

  init() {
  },

  finish(code) {
    return code;
  },

  scrubNakedValue(line) {
    return line + '\n';
  },

  quote_(string) {
    string = string.replace(/"/g, '""');
    return '"' + string + '"';
  },

  scrub_(block, code) {
    return code;
  },

  // logic

  logic_compare(block) {
    let OPERATORS = {
      'EQ':   '=',
      'NEQ':  '!=',
      'LT':   '<',
      'LTE':  '<=',
      'GT':   '>',
      'GTE':  '>='
    };
    let op = OPERATORS[block.getFieldValue('OP')];
    let order = Blockly.Start.REL_OP;
    let left = Blockly.Start.valueToCode(block, 'A', order) || '0';
    let right = Blockly.Start.valueToCode(block, 'B', order) || '0';
    let code = left + ' ' + op + ' ' + right;
    return [ code, order ];
  },

  logic_operation(block) {
    let op = block.getFieldValue('OP').toLowerCase();
    let order = Blockly.Start.LOGICAL_OP;
    let left = Blockly.Start.valueToCode(block, 'A', order);
    let right = Blockly.Start.valueToCode(block, 'B', order);
    if (!left || !right) {
      return ['false', order];
    }
    return [ left + ' ' + op + ' ' + right, order ];
  },

  logic_negate(block) {
    let order = Blockly.Start.LOGICAL_NOT;
    let left = Blockly.Start.valueToCode(block, 'BOOL', order) || 'true';
    return [ 'not ' + left, order ];
  },

  logic_boolean(block) {
    return [ block.getFieldValue('BOOL').toLowerCase(),
             Blockly.Start.LITERAL ];
  },

  logic_null(block) {
    return [ 'none', Blockly.Start.LITERAL ];
  },

  // math

  math_number(block) {
    return [ parseFloat(block.getFieldValue('NUM')), Blockly.Start.LITERAL ];
  },

  qqmath_arithmetic(block) {
    let OPERATORS = {
      'ADD':      '+',
      'MINUS':    '-',
      'MULTIPLY': '*',
      'DIVIDE':   '/',
      'POWER':    '**'
    };

    let op = block.getFieldValue('OP');
  }
});
