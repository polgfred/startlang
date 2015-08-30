'use strict';

let Blockly = require('node-blockly/lib/blockly_compressed');

Blockly.Blocks['control_start'] = {
  init: function() {
    this.setDeletable(false);
    this.setColour(Blockly.Blocks.control.HUE);
    this.appendDummyInput()
        .appendField('start program');
    this.setNextStatement(true);
    this.setTooltip('This is the entry point of your program. Attach blocks here!');
    this.setHelpUrl('');
  }
};

Blockly.Blocks['control_end'] = {
  init: function() {
    this.setColour(Blockly.Blocks.control.HUE);
    this.appendDummyInput()
        .appendField('end program');
    this.setPreviousStatement(true);
    this.setTooltip('This causes the program to terminate.');
    this.setHelpUrl('');
  }
};
