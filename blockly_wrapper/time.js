'use strict';

let Blockly = require('node-blockly/lib/blockly_compressed');

// TODO: time
//    the current time
//    the beginning/end of this year/month/day/hour/minute/second
//    %1 years/months/days/hours/minutes/seconds from now
//    %1 years/months/days/hours/minutes/seconds from %2
//    the year/month/day/hour/minute/second part of %1
//    the number of years/months/days/hours/minutes/seconds between %1 and %2
//    create time from text with format
//    create time from fields

Blockly.Blocks['time_sleep'] = {
  init: function() {
    this.setColour(Blockly.Blocks.time.HUE);
    this.appendValueInput('SECONDS')
        .setCheck('Number')
        .appendField('wait for');
    this.appendDummyInput()
        .appendField('seconds');
    this.setInputsInline(true);
    this.setPreviousStatement(true);
    this.setNextStatement(true);
    this.setTooltip('Pause the program for the specified time.');
    this.setHelpUrl('');
  }
};
