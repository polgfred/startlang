import * as Blockly from 'blockly';

Blockly.Blocks['lists_functions'] = {
  init() {
    const OPERATORS = [
      [Blockly.Msg.MATH_ONLIST_OPERATOR_SUM, 'SUM'],
      [Blockly.Msg.MATH_ONLIST_OPERATOR_MIN, 'MIN'],
      [Blockly.Msg.MATH_ONLIST_OPERATOR_MAX, 'MAX'],
      [Blockly.Msg.MATH_ONLIST_OPERATOR_AVERAGE, 'AVERAGE'],
    ];
    this.setHelpUrl(Blockly.Msg.MATH_ONLIST_HELPURL);
    this.setColour(Blockly.Msg.LISTS_HUE);
    this.setOutput(true);
    this.appendValueInput('LIST')
      .setCheck('Array')
      .appendField(new Blockly.FieldDropdown(OPERATORS), 'OP');
    this.setTooltip(() => {
      const mode = this.getFieldValue('OP');
      const TOOLTIPS = {
        SUM: Blockly.Msg.MATH_ONLIST_TOOLTIP_SUM,
        MIN: Blockly.Msg.MATH_ONLIST_TOOLTIP_MIN,
        MAX: Blockly.Msg.MATH_ONLIST_TOOLTIP_MAX,
        AVERAGE: Blockly.Msg.MATH_ONLIST_TOOLTIP_AVERAGE,
      };
      return TOOLTIPS[mode];
    });
  },
};

Blockly.Blocks['lists_transformers'] = {
  init() {
    const OPERATORS = [
      [Blockly.Msg.MATH_ONLIST_OPERATOR_SORT, 'SORT'],
      [Blockly.Msg.MATH_ONLIST_OPERATOR_REVERSE, 'REVERSE'],
      [Blockly.Msg.MATH_ONLIST_OPERATOR_SHUFFLE, 'SHUFFLE'],
    ];
    this.setHelpUrl(Blockly.Msg.MATH_ONLIST_HELPURL);
    this.setColour(Blockly.Msg.LISTS_HUE);
    this.setPreviousStatement(true);
    this.setNextStatement(true);
    this.appendValueInput('LIST')
      .setCheck('Array')
      .appendField(
        new Blockly.FieldDropdown(OPERATORS, (value) => {
          this.updateOrder_(value === 'SORT');
        }),
        'OP'
      );
    this.appendDummyInput('TAIL');
    this.setInputsInline(true);
    this.updateOrder_(true);
    this.setTooltip(() => {
      const mode = this.getFieldValue('OP');
      const order = this.getFieldValue('ORDER');
      const TOOLTIPS = {
        SORT: Blockly.Msg[`MATH_ONLIST_TOOLTIP_SORT_${order}`],
        REVERSE: Blockly.Msg.MATH_ONLIST_TOOLTIP_REVERSE,
        SHUFFLE: Blockly.Msg.MATH_ONLIST_TOOLTIP_SHUFFLE,
      };
      return TOOLTIPS[mode];
    });
  },
  updateOrder_(isOrder) {
    const ORDERS = [
      ['smallest first', 'ASC'],
      ['largest first', 'DESC'],
    ];
    if (isOrder) {
      this.removeInput('TAIL');
      this.appendDummyInput('TAIL').appendField(
        new Blockly.FieldDropdown(ORDERS),
        'ORDER'
      );
    } else {
      this.removeInput('TAIL');
      this.appendDummyInput('TAIL');
    }
  },
  mutationToDom() {
    const container = document.createElement('mutation');
    const isOrder = this.getField('ORDER') !== null;
    container.setAttribute('order', isOrder);
    return container;
  },
  domToMutation(xmlElement) {
    const isOrder = xmlElement.getAttribute('order') !== 'false';
    this.updateOrder_(isOrder);
  },
};
