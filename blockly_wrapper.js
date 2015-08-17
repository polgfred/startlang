'use strict';

import _ from 'lodash';

export default Blockly = require('node-blockly/lib/blockly_compressed');

Blockly.Msg = _.extend(require('node-blockly/lib/i18n/en'), Blockly.Msg);
Blockly.Msg = Blockly.Msg();

Blockly.Blocks = _.extend(Blockly.Blocks, require('node-blockly/lib/blocks_compressed')(Blockly));

Blockly.Msg.LOGIC_NULL = 'nothing';
Blockly.Msg.LOGIC_NULL_TOOLTIP = 'Returns nothing.';

Blockly.Msg.CONTROLS_IF_MSG_THEN = 'then';

Blockly.Blocks.tables = {};

Blockly.Blocks.tables.HUE = 20;

Blockly.Msg.TABLES_CREATE_EMPTY_TITLE = 'create empty table';
Blockly.Msg.TABLES_CREATE_EMPTY_TOOLTIP = 'Create an empty table.';
Blockly.Msg.TABLES_CREATE_EMPTY_HELPURL = '';
Blockly.Msg.TABLES_CREATE_WITH_HELPURL = '';
Blockly.Msg.TABLES_CREATE_WITH_TOOLTIP = 'Create a table with any number of keys and values.';
Blockly.Msg.TABLES_CREATE_WITH_INPUT_WITH = 'create table with';
Blockly.Msg.TABLES_CREATE_WITH_INPUT_KEY = 'key';
Blockly.Msg.TABLES_CREATE_WITH_INPUT_AS = 'as';
Blockly.Msg.TABLES_CREATE_WITH_CONTAINER_TITLE_ADD = 'table';
Blockly.Msg.TABLES_CREATE_WITH_CONTAINER_TOOLTIP = 'Add or remove sections to reconfigure this table block.';
Blockly.Msg.TABLES_CREATE_WITH_ITEM_TITLE = Blockly.Msg.VARIABLES_DEFAULT_NAME;
Blockly.Msg.TABLES_CREATE_WITH_ITEM_TOOLTIP = 'Add an item to the table.';
Blockly.Msg.TABLES_SIZE_TITLE = 'size of %1';
Blockly.Msg.TABLES_SIZE_TOOLTIP = '';
Blockly.Msg.TABLES_SIZE_HELPURL = '';
Blockly.Msg.TABLES_ISEMPTY_TITLE = '%1 is empty';
Blockly.Msg.TABLES_ISEMPTY_TOOLTIP = '';
Blockly.Msg.TABLES_ISEMPTY_HELPURL = '';
Blockly.Msg.TABLES_GET_INDEX_GET = 'get';
Blockly.Msg.TABLES_GET_INDEX_GET_REMOVE = 'get and remove';
Blockly.Msg.TABLES_GET_INDEX_REMOVE = 'remove';
Blockly.Msg.TABLES_GET_INDEX_HELPURL = '';
Blockly.Msg.TABLES_GET_INDEX_INPUT_IN_TABLE = 'in table';
Blockly.Msg.TABLES_GET_INDEX_TAIL = '';
Blockly.Msg.TABLES_GET_INDEX_TOOLTIP_GET = 'Returns the item for the specified key in a table.';
Blockly.Msg.TABLES_GET_INDEX_TOOLTIP_GET_REMOVE = 'Removes and returns the item for the specified key in a table.';
Blockly.Msg.TABLES_GET_INDEX_TOOLTIP_REMOVE = 'Removes the item for the specified key in a table.';
Blockly.Msg.TABLES_SET_INDEX_SET = 'set';
Blockly.Msg.TABLES_SET_INDEX_INSERT = 'insert';
Blockly.Msg.TABLES_SET_INDEX_HELPURL = '';
Blockly.Msg.TABLES_SET_INDEX_INPUT_IN_TABLE = 'in table';
Blockly.Msg.TABLES_SET_INDEX_INPUT_TO = 'as';
Blockly.Msg.TABLES_SET_INDEX_TOOLTIP = 'Sets the item for the specified key in a table.';

Blockly.Blocks['tables_create_empty'] = {
  init: function() {
    this.appendDummyInput()
        .appendField(Blockly.Msg.TABLES_CREATE_EMPTY_TITLE);
    this.setOutput(true, "Map");
    this.setColour(Blockly.Blocks.tables.HUE);
    this.setTooltip(Blockly.Msg.TABLES_CREATE_EMPTY_TOOLTIP);
    this.setHelpUrl(Blockly.Msg.TABLES_CREATE_EMPTY_HELPURL);
  }
};

Blockly.Blocks['tables_create_with'] = {
  init: function() {
    this.savedKeys = [];
    this.setHelpUrl(Blockly.Msg.TABLES_CREATE_WITH_HELPURL);
    this.setColour(Blockly.Blocks.tables.HUE);
    this.itemCount_ = 3;
    this.updateShape_();
    this.setOutput(true, 'Map');
    this.setMutator(new Blockly.Mutator(['tables_create_with_item']));
    this.setTooltip(Blockly.Msg.TABLES_CREATE_WITH_TOOLTIP);
  },
  mutationToDom: function() {
    var container = document.createElement('mutation');
    container.setAttribute('items', this.itemCount_);
    return container;
  },
  domToMutation: function(xmlElement) {
    this.itemCount_ = parseInt(xmlElement.getAttribute('items'), 10);
    this.updateShape_();
  },
  decompose: function(workspace) {
    var containerBlock = Blockly.Block.obtain(workspace, 'tables_create_with_container');
    containerBlock.initSvg();
    var connection = containerBlock.getInput('STACK').connection;
    for (var i = 0; i < this.itemCount_; i++) {
      var itemBlock = Blockly.Block.obtain(workspace, 'tables_create_with_item');
      itemBlock.initSvg();
      connection.connect(itemBlock.previousConnection);
      connection = itemBlock.nextConnection;
    }
    return containerBlock;
  },
  compose: function(containerBlock) {
    var itemBlock = containerBlock.getInputTargetBlock('STACK');
    // Count number of inputs.
    var connections = [];
    while (itemBlock) {
      connections.push(itemBlock.valueConnection_);
      itemBlock = itemBlock.nextConnection && itemBlock.nextConnection.targetBlock();
    }
    this.itemCount_ = connections.length;
    this.updateShape_();
    // Reconnect any child blocks.
    for (var i = 0; i < this.itemCount_; i++) {
      if (connections[i]) {
        this.getInput('VALUE' + i).connection.connect(connections[i]);
      }
    }
  },
  saveConnections: function(containerBlock) {
    var itemBlock = containerBlock.getInputTargetBlock('STACK');
    var i = 0;
    while (itemBlock) {
      var input = this.getInput('VALUE' + i);
      itemBlock.valueConnection_ = input && input.connection.targetConnection;
      i++;
      itemBlock = itemBlock.nextConnection && itemBlock.nextConnection.targetBlock();
    }
  },
  updateShape_: function() {
    // Delete everything, but save off key values first.
    if (this.getInput('EMPTY')) {
      this.removeInput('EMPTY');
    } else {
      var i = 0;
      while (this.getInput('VALUE' + i)) {
        this.savedKeys[i] = this.getFieldValue('KEY' + i);
        this.removeInput('VALUE' + i);
        i++;
      }
    }
    // Rebuild block.
    if (this.itemCount_ == 0) {
      this.appendDummyInput('EMPTY')
          .appendField(Blockly.Msg.TABLES_CREATE_EMPTY_TITLE);
    } else {
      for (var i = 0; i < this.itemCount_; i++) {
        var input = this.appendValueInput('VALUE' + i);
        if (i == 0) {
          input.appendField(Blockly.Msg.TABLES_CREATE_WITH_INPUT_WITH);
        } else {
          input.setAlign(Blockly.ALIGN_RIGHT);
        }
        input.appendField(Blockly.Msg.TABLES_CREATE_WITH_INPUT_KEY)
             .appendField(new Blockly.FieldTextInput(this.savedKeys[i] || 'key' + (i+1)), 'KEY' + i)
             .appendField(Blockly.Msg.TABLES_CREATE_WITH_INPUT_AS);
      }
    }
  }
};

Blockly.Blocks['tables_create_with_container'] = {
  init: function() {
    this.setColour(Blockly.Blocks.tables.HUE);
    this.appendDummyInput()
        .appendField(Blockly.Msg.TABLES_CREATE_WITH_CONTAINER_TITLE_ADD);
    this.appendStatementInput('STACK');
    this.setTooltip(Blockly.Msg.TABLES_CREATE_WITH_CONTAINER_TOOLTIP);
    this.contextMenu = false;
  }
};

Blockly.Blocks['tables_create_with_item'] = {
  init: function() {
    this.setColour(Blockly.Blocks.tables.HUE);
    this.appendDummyInput()
        .appendField(Blockly.Msg.TABLES_CREATE_WITH_ITEM_TITLE);
    this.setPreviousStatement(true);
    this.setNextStatement(true);
    this.setTooltip(Blockly.Msg.TABLES_CREATE_WITH_ITEM_TOOLTIP);
    this.contextMenu = false;
  }
};

Blockly.Blocks['tables_size'] = {
  init: function() {
    this.jsonInit({
      "message0": Blockly.Msg.TABLES_SIZE_TITLE,
      "args0": [
        {
          "type": "input_value",
          "name": "VALUE",
          "check": ['Map']
        }
      ],
      "output": 'Number',
      "colour": Blockly.Blocks.tables.HUE,
      "tooltip": Blockly.Msg.TABLES_SIZE_TOOLTIP,
      "helpUrl": Blockly.Msg.TABLES_SIZE_HELPURL
    });
  }
};

Blockly.Blocks['tables_isEmpty'] = {
  init: function() {
    this.jsonInit({
      "message0": Blockly.Msg.TABLES_ISEMPTY_TITLE,
      "args0": [
        {
          "type": "input_value",
          "name": "VALUE",
          "check": ['Map']
        }
      ],
      "output": 'Boolean',
      "colour": Blockly.Blocks.tables.HUE,
      "tooltip": Blockly.Msg.TABLES_ISEMPTY_TOOLTIP,
      "helpUrl": Blockly.Msg.TABLES_ISEMPTY_HELPURL
    });
  }
};

Blockly.Blocks['tables_getIndex'] = {
  init: function() {
    var MODE =
        [[Blockly.Msg.TABLES_GET_INDEX_GET, 'GET'],
         [Blockly.Msg.TABLES_GET_INDEX_GET_REMOVE, 'GET_REMOVE'],
         [Blockly.Msg.TABLES_GET_INDEX_REMOVE, 'REMOVE']];
    this.setHelpUrl(Blockly.Msg.TABLES_GET_INDEX_HELPURL);
    this.setColour(Blockly.Blocks.tables.HUE);
    var modeMenu = new Blockly.FieldDropdown(MODE, function(value) {
      var isStatement = (value == 'REMOVE');
      this.sourceBlock_.updateStatement_(isStatement);
    });
    this.appendValueInput('VALUE')
        .setCheck('Map')
        .appendField(Blockly.Msg.TABLES_GET_INDEX_INPUT_IN_TABLE);
    this.appendDummyInput()
        .appendField(modeMenu, 'MODE');
    this.appendValueInput('AT').setCheck('String');
    if (Blockly.Msg.TABLES_GET_INDEX_TAIL) {
      this.appendDummyInput('TAIL')
          .appendField(Blockly.Msg.TABLES_GET_INDEX_TAIL);
    }
    this.setInputsInline(true);
    this.setOutput(true);
    // Assign 'this' to a variable for use in the tooltip closure below.
    var thisBlock = this;
    this.setTooltip(function() {
      var mode = thisBlock.getFieldValue('MODE');
      return Blockly.Msg['TABLES_GET_INDEX_TOOLTIP_' + mode];
    });
  },
  mutationToDom: function() {
    var container = document.createElement('mutation');
    var isStatement = !this.outputConnection;
    container.setAttribute('statement', isStatement);
    return container;
  },
  domToMutation: function(xmlElement) {
    var isStatement = (xmlElement.getAttribute('statement') == 'true');
    this.updateStatement_(isStatement);
  },
  updateStatement_: function(newStatement) {
    var oldStatement = !this.outputConnection;
    if (newStatement != oldStatement) {
      this.unplug(true, true);
      if (newStatement) {
        this.setOutput(false);
        this.setPreviousStatement(true);
        this.setNextStatement(true);
      } else {
        this.setPreviousStatement(false);
        this.setNextStatement(false);
        this.setOutput(true);
      }
    }
  }
};

Blockly.Blocks['tables_setIndex'] = {
  init: function() {
    this.setHelpUrl(Blockly.Msg.TABLES_SET_INDEX_HELPURL);
    this.setColour(Blockly.Blocks.tables.HUE);
    this.appendValueInput('TABLE')
        .setCheck('Map')
        .appendField(Blockly.Msg.TABLES_SET_INDEX_INPUT_IN_TABLE);
    this.appendDummyInput()
        .appendField('set');
    this.appendValueInput('AT').setCheck('String');
    this.appendValueInput('TO')
        .appendField(Blockly.Msg.TABLES_SET_INDEX_INPUT_TO);
    this.setInputsInline(true);
    this.setPreviousStatement(true);
    this.setNextStatement(true);
    this.setTooltip(Blockly.Msg.TABLES_SET_INDEX_TOOLTIP);
  }
};

// code-generation

Blockly.Start = _.extend(new Blockly.Generator('Start'), {
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
