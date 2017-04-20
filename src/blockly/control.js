'use strict';

Blockly.Blocks['control_exit'] = {
  init() {
    this.setColour(Blockly.Blocks.control.HUE);
    this.appendDummyInput()
        .appendField('exit program');
    this.setPreviousStatement(true);
    this.setTooltip('This causes the program to terminate immediately.');
    this.setHelpUrl('');
  }
};
