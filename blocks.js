import Blockly from 'node-blockly';

Blockly.Msg.LOGIC_NULL = 'nothing';
Blockly.Msg.LOGIC_NULL_TOOLTIP = 'Returns nothing.';
Blockly.Msg.CONTROLS_IF_MSG_THEN = 'then';

// clearer to have separate if/then and if/then/else blocks without
// the configuration voodoo

Blockly.Blocks['controls_if0'] = {
  init: function() {
    this.appendValueInput("IF")
        .setCheck("Boolean")
        .appendField("if");
    this.appendStatementInput("DO")
        .appendField("then");
    this.setPreviousStatement(true);
    this.setNextStatement(true);
    this.setColour(Blockly.Blocks.logic.HUE);
    this.setTooltip(Blockly.Msg.CONTROLS_IF_TOOLTIP_1);
    this.setHelpUrl(Blockly.Msg.CONTROLS_IF_HELPURL);
  }
};

Blockly.Blocks['controls_if_else0'] = {
  init: function() {
    this.appendValueInput("IF")
        .setCheck("Boolean")
        .appendField("if");
    this.appendStatementInput("DO")
        .appendField("then");
    this.appendStatementInput("ELSE")
        .appendField("else");
    this.setPreviousStatement(true);
    this.setNextStatement(true);
    this.setColour(Blockly.Blocks.logic.HUE);
    this.setTooltip(Blockly.Msg.CONTROLS_IF_TOOLTIP_2);
    this.setHelpUrl(Blockly.Msg.CONTROLS_IF_HELPURL);
  }
};
