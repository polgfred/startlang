'use strict';

let Blockly = require('node-blockly/lib/blockly_compressed');

Blockly.Blocks['math_angle'] = {
  init: function() {
    this.jsonInit({
      id: 'math_angle',
      message0: '%1',
      args0: [
        { type: 'field_angle', name: 'ANGLE', angle: 90 }
      ],
      output: 'Number',
      colour: Blockly.Blocks.math.HUE,
      tooltip: 'An angle.'
    });
  }
};
