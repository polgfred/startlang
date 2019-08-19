import Blockly from 'blockly';

const UNITS = [
  ['year', 'YEAR'],
  ['month', 'MONTH'],
  ['date', 'DATE'],
  ['day', 'DAY'],
  ['hour', 'HOUR'],
  ['minute', 'MINUTE'],
  ['second', 'SECOND'],
  ['millisecond', 'MILLISECOND'],
];

Blockly.Blocks['time_sleep'] = {
  init() {
    this.setColour(Blockly.Msg.TIME_HUE);
    this.appendValueInput('SECONDS')
      .setCheck('Number')
      .appendField('wait for');
    this.appendDummyInput().appendField('seconds');
    this.setInputsInline(true);
    this.setPreviousStatement(true);
    this.setNextStatement(true);
    this.setTooltip('Pause the program for some number of seconds.');
    this.setHelpUrl('');
  },
};

Blockly.Blocks['time_create_empty'] = {
  init() {
    this.setColour(Blockly.Msg.TIME_HUE);
    this.appendDummyInput().appendField('current time');
    this.setInputsInline(true);
    this.setOutput(true, 'Time');
    this.setTooltip('Returns the current time.');
    this.setHelpUrl('');
  },
};

Blockly.Blocks['time_create_with'] = {
  init() {
    this.setColour(Blockly.Msg.TIME_HUE);
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
    this.setTooltip('Create a time with the specified units.');
    this.setHelpUrl('');
  },
};

Blockly.Blocks['time_getPart'] = {
  init() {
    this.setColour(Blockly.Msg.TIME_HUE);
    this.appendValueInput('TIME')
      .setCheck('Time')
      .appendField('extract')
      .appendField(new Blockly.FieldDropdown(UNITS), 'UNIT')
      .appendField('from time');
    this.setInputsInline(true);
    this.setOutput(true, 'Number');
    this.setTooltip(
      () =>
        `Extracts the ${this.getFieldValue(
          'UNIT'
        ).toLowerCase()} from the specified time.`
    );
    this.setHelpUrl('');
  },
};

Blockly.Blocks['time_diff'] = {
  init() {
    this.setColour(Blockly.Msg.TIME_HUE);
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
    this.setTooltip(() => {
      const unit = this.getFieldValue('UNIT').toLowerCase();
      return `Calculates the number of ${unit}s between two times.`;
    });
    this.setHelpUrl('');
  },
};

Blockly.Blocks['time_addSubtract'] = {
  init() {
    const MODES = [['add', 'ADD'], ['subtract', 'SUB']];
    this.setColour(Blockly.Msg.TIME_HUE);
    this.timeInput = this.appendValueInput('TIME')
      .setCheck('Time')
      .appendField('to time', 'FROM_TO');
    this.appendValueInput('VALUE')
      .setCheck('Number')
      .appendField(
        new Blockly.FieldDropdown(MODES, this.updateMode_.bind(this)),
        'MODE'
      );
    this.appendDummyInput().appendField(
      new Blockly.FieldDropdown(UNITS),
      'UNIT'
    );
    this.setInputsInline(true);
    this.setPreviousStatement(true);
    this.setNextStatement(true);
    this.setTooltip(() => {
      const mode = this.getFieldValue('MODE') == 'ADD' ? 'Add' : 'Subtract';
      const from_to = this.getFieldValue('MODE') == 'ADD' ? 'to' : 'from';
      const unit = this.getFieldValue('UNIT').toLowerCase();
      return `${mode}s some number of ${unit}s ${from_to} the specified time.`;
    });
    this.setHelpUrl('');
  },
  setFieldValue(value, name) {
    this.constructor.superClass_.setFieldValue.call(this, value, name);
    if (name == 'MODE') {
      this.updateMode_(value);
    }
  },
  updateMode_(mode) {
    this.timeInput.removeField('FROM_TO');
    this.timeInput.appendField(
      `${mode == 'ADD' ? 'to' : 'from'} time`,
      'FROM_TO'
    );
  },
};

Blockly.Blocks['time_startEnd'] = {
  init() {
    const MODES = [['beginning', 'START'], ['end', 'END']];
    this.setColour(Blockly.Msg.TIME_HUE);
    this.appendValueInput('TIME')
      .setCheck('Time')
      .appendField('round time');
    this.appendDummyInput()
      .appendField('to')
      .appendField(new Blockly.FieldDropdown(MODES), 'MODE')
      .appendField('of')
      .appendField(new Blockly.FieldDropdown(UNITS), 'UNIT');
    this.setInputsInline(true);
    this.setPreviousStatement(true);
    this.setNextStatement(true);
    this.setTooltip(() => {
      const mode = this.getFieldValue('MODE') == 'START' ? 'beginning' : 'end';
      const unit = this.getFieldValue('UNIT').toLowerCase();
      return `Rounds the specified time to the ${mode} of the enclosing ${unit}.`;
    });
    this.setHelpUrl('');
  },
};
