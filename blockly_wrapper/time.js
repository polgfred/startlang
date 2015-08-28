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


function unitDropdown(plural) {
  let suffix = plural ? 's' : '';

  return new Blockly.FieldDropdown([
    [ `year${suffix}`,    'YEAR'    ],
    [ `month${suffix}`,   'MONTH'   ],
    [ `day${suffix}`,     'DAY'     ],
    [ `hour${suffix}`,    'HOUR'    ],
    [ `minute${suffix}`,  'MINUTE'  ],
    [ `second${suffix}`,  'SECOND'  ]
  ]);
}

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

Blockly.Blocks['time_create_empty'] = {
  init: function() {
    this.setColour(Blockly.Blocks.time.HUE);
    this.appendDummyInput()
        .appendField('current time');
    this.setInputsInline(true);
    this.setOutput(true, 'Time');
    this.setTooltip('Returns the current time.');
    this.setHelpUrl('');
  }
};

Blockly.Blocks['time_create_with'] = {
  init: function() {
    this.setColour(Blockly.Blocks.time.HUE);
    this.appendValueInput('YEARS')
        .setCheck('Number')
        .setAlign(Blockly.ALIGN_RIGHT)
        .appendField('time with')
        .appendField('years');
    this.appendValueInput('MONTHS')
        .setCheck('Number')
        .setAlign(Blockly.ALIGN_RIGHT)
        .appendField('months');
    this.appendValueInput('DAYS')
        .setCheck('Number')
        .setAlign(Blockly.ALIGN_RIGHT)
        .appendField('days');
    this.appendValueInput('HOURS')
        .setCheck('Number')
        .setAlign(Blockly.ALIGN_RIGHT)
        .appendField('hours');
    this.appendValueInput('MINUTES')
        .setCheck('Number')
        .setAlign(Blockly.ALIGN_RIGHT)
        .appendField('minutes');
    this.appendValueInput('SECONDS')
        .setCheck('Number')
        .setAlign(Blockly.ALIGN_RIGHT)
        .appendField('seconds');
    this.setOutput(true, 'Time');
    this.setTooltip('Creates a time with the specified units.');
    this.setHelpUrl('');
  }
};

Blockly.Blocks['time_getPart'] = {
  init: function() {
    this.setColour(Blockly.Blocks.time.HUE);
    this.appendValueInput('TIME')
        .setCheck('Time')
        .appendField('extract')
        .appendField(unitDropdown(), 'UNIT')
        .appendField('from');
    this.setInputsInline(true);
    this.setOutput(true, 'Number');
    this.setTooltip(() => `Extracts the ${this.getFieldValue('UNIT').toLowerCase()} from the specified time.`);
    this.setHelpUrl('');
  }
};

Blockly.Blocks['time_addSubtract'] = {
  init: function() {
    let MODES = [
      [ 'add',      'ADD' ],
      [ 'subtract', 'SUB' ]
    ];
    this.setColour(Blockly.Blocks.time.HUE);
    this.appendValueInput('VALUE')
        .setCheck('Number')
        .appendField(new Blockly.FieldDropdown(MODES, this.updateMode_.bind(this)), 'MODE');
    this.timeInput = this.appendValueInput('TIME')
        .setCheck('Time')
        .appendField(unitDropdown(true), 'UNIT')
        .appendField('to', 'FROM_TO');
    this.setInputsInline(true);
    this.setPreviousStatement(true);
    this.setNextStatement(true);
    this.setTooltip(() => ``);
    this.setHelpUrl('');
  },
  setFieldValue: function(value, name) {
    this.constructor.superClass_.setFieldValue.call(this, value, name);
    if (name == 'MODE') {
      this.updateMode_(value);
    }
  },
  updateMode_: function(mode) {
    this.timeInput.removeField('FROM_TO');
    this.timeInput.appendField(mode == 'ADD' ? 'to' : 'from', 'FROM_TO');
  }
};
