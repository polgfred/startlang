'use strict';

let Blockly = require('node-blockly/lib/blockly_compressed');

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
    this.appendValueInput('YEAR')
        .setCheck('Number')
        .setAlign(Blockly.ALIGN_RIGHT)
        .appendField('time with')
        .appendField('years');
    this.appendValueInput('MONTH')
        .setCheck('Number')
        .setAlign(Blockly.ALIGN_RIGHT)
        .appendField('months');
    this.appendValueInput('DAY')
        .setCheck('Number')
        .setAlign(Blockly.ALIGN_RIGHT)
        .appendField('days');
    this.appendValueInput('HOUR')
        .setCheck('Number')
        .setAlign(Blockly.ALIGN_RIGHT)
        .appendField('hours');
    this.appendValueInput('MINUTE')
        .setCheck('Number')
        .setAlign(Blockly.ALIGN_RIGHT)
        .appendField('minutes');
    this.appendValueInput('SECOND')
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
    let UNITS = [
      [ 'year',        'YEAR'        ],
      [ 'month',       'MONTH'       ],
      [ 'date',        'DATE'        ],
      [ 'day',         'DAY'         ],
      [ 'hour',        'HOUR'        ],
      [ 'minute',      'MINUTE'      ],
      [ 'second',      'SECOND'      ],
      [ 'millisecond', 'MILLISECOND' ]
    ];

    this.setColour(Blockly.Blocks.time.HUE);
    this.appendValueInput('TIME')
        .setCheck('Time')
        .appendField('extract')
        .appendField(new Blockly.FieldDropdown(UNITS), 'UNIT')
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
    let UNITS = [
      [ 'years',        'YEAR'        ],
      [ 'months',       'MONTH'       ],
      [ 'days',         'DAY'         ],
      [ 'hours',        'HOUR'        ],
      [ 'minutes',      'MINUTE'      ],
      [ 'seconds',      'SECOND'      ],
      [ 'milliseconds', 'MILLISECOND' ]
    ];

    this.setColour(Blockly.Blocks.time.HUE);
    this.timeInput = this.appendValueInput('TIME')
        .setCheck('Time')
        .appendField('to', 'FROM_TO');
    this.appendValueInput('VALUE')
        .setCheck('Number')
        .appendField(new Blockly.FieldDropdown(MODES, this.updateMode_.bind(this)), 'MODE');
    this.appendDummyInput()
        .appendField(new Blockly.FieldDropdown(UNITS), 'UNIT');
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

Blockly.Blocks['time_startEnd'] = {
  init: function() {
    let MODES = [
      [ 'beginning',  'START' ],
      [ 'end',        'END'   ]
    ];
    let UNITS = [
      [ 'year',        'YEAR'        ],
      [ 'month',       'MONTH'       ],
      [ 'day',         'DAY'         ],
      [ 'hour',        'HOUR'        ],
      [ 'minute',      'MINUTE'      ],
      [ 'second',      'SECOND'      ],
      [ 'millisecond', 'MILLISECOND' ]
    ];

    this.setColour(Blockly.Blocks.time.HUE);
    this.appendValueInput('TIME')
        .setCheck('Time')
        .appendField('round');
    this.appendDummyInput()
        .appendField('to')
        .appendField(new Blockly.FieldDropdown(MODES), 'MODE')
        .appendField('of')
        .appendField(new Blockly.FieldDropdown(UNITS), 'UNIT');
    this.setInputsInline(true);
    this.setPreviousStatement(true);
    this.setNextStatement(true);
    this.setTooltip(() => ``);
    this.setHelpUrl('');
  }
};

Blockly.Blocks['time_diff'] = {
  init: function() {
    let UNITS = [
      [ 'years',        'YEAR'        ],
      [ 'months',       'MONTH'       ],
      [ 'days',         'DAY'         ],
      [ 'hours',        'HOUR'        ],
      [ 'minutes',      'MINUTE'      ],
      [ 'seconds',      'SECOND'      ],
      [ 'milliseconds', 'MILLISECOND' ]
    ];

    this.setColour(Blockly.Blocks.time.HUE);
    this.appendValueInput('TIME1')
        .setCheck('Time')
        .appendField('number of')
        .appendField(new Blockly.FieldDropdown(UNITS), 'UNIT')
        .appendField('between');
    this.appendValueInput('TIME2')
        .setCheck('Time')
        .appendField('and');
    this.setInputsInline(true);
    this.setOutput(true, 'Number');
    this.setTooltip(() => ``);
    this.setHelpUrl('');
  }
};
