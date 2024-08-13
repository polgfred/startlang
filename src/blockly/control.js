import * as Blockly from 'blockly';

Blockly.Blocks['control_exit'] = {
  init() {
    this.setColour(Blockly.Msg.CONTROL_HUE);
    this.appendDummyInput().appendField('exit program');
    this.setPreviousStatement(true);
    this.setTooltip('This causes the program to terminate immediately.');
    this.setHelpUrl('');
  },
};
