'use strict';

Blockly.Blocks['lists_functions'] = {
  init: function() {
    let OPERATORS =
        [[Blockly.Msg.MATH_ONLIST_OPERATOR_SUM, 'SUM'],
         [Blockly.Msg.MATH_ONLIST_OPERATOR_MIN, 'MIN'],
         [Blockly.Msg.MATH_ONLIST_OPERATOR_MAX, 'MAX'],
         [Blockly.Msg.MATH_ONLIST_OPERATOR_AVERAGE, 'AVERAGE']];
    this.setHelpUrl(Blockly.Msg.MATH_ONLIST_HELPURL);
    this.setColour(Blockly.Blocks.lists.HUE);
    this.setOutput(true);
    this.appendValueInput('LIST')
        .setCheck('Array')
        .appendField(new Blockly.FieldDropdown(OPERATORS), 'OP');
    this.setTooltip(() => {
      let mode = this.getFieldValue('OP');
      let TOOLTIPS = {
        'SUM': Blockly.Msg.MATH_ONLIST_TOOLTIP_SUM,
        'MIN': Blockly.Msg.MATH_ONLIST_TOOLTIP_MIN,
        'MAX': Blockly.Msg.MATH_ONLIST_TOOLTIP_MAX,
        'AVERAGE': Blockly.Msg.MATH_ONLIST_TOOLTIP_AVERAGE
      };
      return TOOLTIPS[mode];
    });
  }
};

Blockly.Blocks['lists_transformers'] = {
  init: function() {
    let OPERATORS =
        [[Blockly.Msg.MATH_ONLIST_OPERATOR_SORT, 'SORT'],
         [Blockly.Msg.MATH_ONLIST_OPERATOR_REVERSE, 'REVERSE'],
         [Blockly.Msg.MATH_ONLIST_OPERATOR_SHUFFLE, 'SHUFFLE']];
    this.setHelpUrl(Blockly.Msg.MATH_ONLIST_HELPURL);
    this.setColour(Blockly.Blocks.lists.HUE);
    this.setPreviousStatement(true);
    this.setNextStatement(true);
    this.appendValueInput('LIST')
        .setCheck('Array')
        .appendField(new Blockly.FieldDropdown(OPERATORS, (value) => {
          this.updateOrder_(value == 'SORT');
        }), 'OP');
    this.appendDummyInput('TAIL');
    this.setInputsInline(true);
    this.updateOrder_(true);
    this.setTooltip(() => {
      let mode = this.getFieldValue('OP');
      let order = this.getFieldValue('ORDER');
      let TOOLTIPS = {
        'SORT': Blockly.Msg[`MATH_ONLIST_TOOLTIP_SORT_${order}`],
        'REVERSE': Blockly.Msg.MATH_ONLIST_TOOLTIP_REVERSE,
        'SHUFFLE': Blockly.Msg.MATH_ONLIST_TOOLTIP_SHUFFLE
      };
      return TOOLTIPS[mode];
    });
  },
  updateOrder_: function(isOrder) {
    let ORDERS =
        [['smallest first', 'ASC'],
         ['largest first',  'DESC']];
    if (isOrder) {
      this.removeInput('TAIL');
      this.appendDummyInput('TAIL')
          .appendField(new Blockly.FieldDropdown(ORDERS), 'ORDER');
    } else {
      this.removeInput('TAIL');
      this.appendDummyInput('TAIL');
    }
  },
  mutationToDom: function() {
    let container = document.createElement('mutation');
    let isOrder = (this.getField('ORDER') != null);
    container.setAttribute('order', isOrder);
    return container;
  },
  domToMutation: function(xmlElement) {
    let isOrder = (xmlElement.getAttribute('order') != 'false');
    this.updateOrder_(isOrder);
  }
};
