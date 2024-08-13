import * as Blockly from 'blockly';
import { FieldAngle, registerFieldAngle } from '@blockly/field-angle';

registerFieldAngle();
// Blockly.FieldAngle.CLOCKWISE = true;
// Blockly.FieldAngle.OFFSET = 90;
// Blockly.FieldAngle.WRAP = 180;

Blockly.Blocks['math_angle'] = {
  init() {
    this.setColour(Blockly.Msg.MATH_HUE);
    this.appendDummyInput().appendField(new FieldAngle('0'), 'ANGLE');
    this.setOutput(true, 'Number');
    this.setTooltip('An angle.');
    this.setHelpUrl('');
    this.setTooltip(() => {
      const parent = this.getParent();
      return (parent && parent.tooltip) || 'An angle.';
    });
  },
};
