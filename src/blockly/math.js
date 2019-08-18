'use strict';

Blockly.FieldAngle.CLOCKWISE = true;
Blockly.FieldAngle.OFFSET = 90;
Blockly.FieldAngle.WRAP = 180;

Blockly.Blocks['math_angle'] = {
  init() {
    this.setColour(Blockly.Blocks.math.HUE);
    this.appendDummyInput().appendField(new Blockly.FieldAngle('0'), 'ANGLE');
    this.setOutput(true, 'Number');
    this.setTooltip('An angle.');
    this.setHelpUrl('');
    this.setTooltip(() => {
      let parent = this.getParent();
      return (parent && parent.tooltip) || 'An angle.';
    });
  },
};
