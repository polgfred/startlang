import Blockly from 'blockly';

Blockly.Blocks['graphics_rect'] = {
  init() {
    this.setColour(Blockly.Msg.GRAPHICS_HUE);
    this.appendValueInput('X')
      .setCheck('Number')
      .setAlign(Blockly.ALIGN_RIGHT)
      .appendField('draw box at')
      .appendField('x');
    this.appendValueInput('Y')
      .setCheck('Number')
      .setAlign(Blockly.ALIGN_RIGHT)
      .appendField('y');
    this.appendValueInput('WIDTH')
      .setCheck('Number')
      .setAlign(Blockly.ALIGN_RIGHT)
      .appendField('width');
    this.appendValueInput('HEIGHT')
      .setCheck('Number')
      .setAlign(Blockly.ALIGN_RIGHT)
      .appendField('height');
    this.setInputsInline(true);
    this.setPreviousStatement(true);
    this.setNextStatement(true);
    this.setTooltip(
      'Display a rectangle with the upper left corner at (x, y), having the specified width and height.'
    );
    this.setHelpUrl('');
  },
};

Blockly.Blocks['graphics_circle'] = {
  init() {
    this.setColour(Blockly.Msg.GRAPHICS_HUE);
    this.appendValueInput('X')
      .setCheck('Number')
      .setAlign(Blockly.ALIGN_RIGHT)
      .appendField('draw circle at')
      .appendField('x');
    this.appendValueInput('Y')
      .setCheck('Number')
      .setAlign(Blockly.ALIGN_RIGHT)
      .appendField('y');
    this.appendValueInput('RADIUS')
      .setCheck('Number')
      .setAlign(Blockly.ALIGN_RIGHT)
      .appendField('radius');
    this.setInputsInline(true);
    this.setPreviousStatement(true);
    this.setNextStatement(true);
    this.setTooltip(
      'Display a circle with the center at (x, y), having the specified radius.'
    );
    this.setHelpUrl('');
  },
};

Blockly.Blocks['graphics_ellipse'] = {
  init() {
    this.setColour(Blockly.Msg.GRAPHICS_HUE);
    this.appendValueInput('X')
      .setCheck('Number')
      .setAlign(Blockly.ALIGN_RIGHT)
      .appendField('draw ellipse at')
      .appendField('x');
    this.appendValueInput('Y')
      .setCheck('Number')
      .setAlign(Blockly.ALIGN_RIGHT)
      .appendField('y');
    this.appendValueInput('XRADIUS')
      .setCheck('Number')
      .setAlign(Blockly.ALIGN_RIGHT)
      .appendField('xradius');
    this.appendValueInput('YRADIUS')
      .setCheck('Number')
      .setAlign(Blockly.ALIGN_RIGHT)
      .appendField('yradius');
    this.setInputsInline(true);
    this.setPreviousStatement(true);
    this.setNextStatement(true);
    this.setTooltip(
      'Display an ellipse (oval) with the center at (x, y), having the specified radii.'
    );
    this.setHelpUrl('');
  },
};

Blockly.Blocks['graphics_line'] = {
  init() {
    this.setColour(Blockly.Msg.GRAPHICS_HUE);
    this.appendValueInput('X1')
      .setCheck('Number')
      .setAlign(Blockly.ALIGN_RIGHT)
      .appendField('draw line from')
      .appendField('x1');
    this.appendValueInput('Y1')
      .setCheck('Number')
      .setAlign(Blockly.ALIGN_RIGHT)
      .appendField('y1');
    this.appendValueInput('X2')
      .setCheck('Number')
      .setAlign(Blockly.ALIGN_RIGHT)
      .appendField('to')
      .appendField('x2');
    this.appendValueInput('Y2')
      .setCheck('Number')
      .setAlign(Blockly.ALIGN_RIGHT)
      .appendField('y2');
    this.setInputsInline(true);
    this.setPreviousStatement(true);
    this.setNextStatement(true);
    this.setTooltip('Display a line from (x1, y1) to (x2, y2).');
    this.setHelpUrl('');
  },
};

Blockly.Blocks['graphics_text'] = {
  init() {
    this.setColour(Blockly.Msg.GRAPHICS_HUE);
    this.appendValueInput('TEXT')
      .setCheck('String')
      .setAlign(Blockly.ALIGN_RIGHT)
      .appendField('draw text');
    this.appendValueInput('X')
      .setCheck('Number')
      .setAlign(Blockly.ALIGN_RIGHT)
      .appendField('at')
      .appendField('x');
    this.appendValueInput('Y')
      .setCheck('Number')
      .setAlign(Blockly.ALIGN_RIGHT)
      .appendField('y');
    this.setInputsInline(true);
    this.setPreviousStatement(true);
    this.setNextStatement(true);
    this.setTooltip(
      'Display text at (x, y). Text is positioned relative to the baseline.'
    );
    this.setHelpUrl('');
  },
};

Blockly.Blocks['graphics_stroke'] = {
  init() {
    this.setColour(Blockly.Msg.GRAPHICS_HUE);
    this.appendValueInput('COLOR')
      .setCheck('Colour')
      .setAlign(Blockly.ALIGN_RIGHT)
      .appendField('set outline color to');
    this.setInputsInline(true);
    this.setPreviousStatement(true);
    this.setNextStatement(true);
    this.setTooltip('Set the shape outline (stroke) to the specified color.');
    this.setHelpUrl('');
  },
};

Blockly.Blocks['graphics_fill'] = {
  init() {
    this.setColour(Blockly.Msg.GRAPHICS_HUE);
    this.appendValueInput('COLOR')
      .setCheck('Colour')
      .setAlign(Blockly.ALIGN_RIGHT)
      .appendField('set fill color to');
    this.setInputsInline(true);
    this.setPreviousStatement(true);
    this.setNextStatement(true);
    this.setTooltip('Set the shape fill color to the specified color.');
    this.setHelpUrl('');
  },
};

Blockly.Blocks['graphics_opacity'] = {
  init() {
    this.setColour(Blockly.Msg.GRAPHICS_HUE);
    this.appendValueInput('AMOUNT')
      .setCheck('Number')
      .setAlign(Blockly.ALIGN_RIGHT)
      .appendField('set opacity to');
    this.setInputsInline(true);
    this.setPreviousStatement(true);
    this.setNextStatement(true);
    this.setTooltip(
      'Set the shape opacity. ' +
        'The value can be anything from 0 (completely transparent) ' +
        'to 1 (completely solid).'
    );
    this.setHelpUrl('');
  },
};

Blockly.Blocks['graphics_rotate'] = {
  init() {
    this.setColour(Blockly.Msg.GRAPHICS_HUE);
    this.appendValueInput('ANGLE')
      .setCheck('Number')
      .setAlign(Blockly.ALIGN_RIGHT)
      .appendField('set angle to');
    this.setInputsInline(true);
    this.setPreviousStatement(true);
    this.setNextStatement(true);
    this.setTooltip('Set the angle of rotation to the specified angle.');
    this.setHelpUrl('');
  },
};

Blockly.Blocks['graphics_scale'] = {
  init() {
    this.setColour(Blockly.Msg.GRAPHICS_HUE);
    this.appendValueInput('MULTX')
      .setCheck('Number')
      .setAlign(Blockly.ALIGN_RIGHT)
      .appendField('set scale factor to')
      .appendField('x');
    this.appendValueInput('MULTY')
      .setCheck('Number')
      .setAlign(Blockly.ALIGN_RIGHT)
      .appendField('y');
    this.setInputsInline(true);
    this.setPreviousStatement(true);
    this.setNextStatement(true);
    this.setTooltip(
      'Set the scale factor to the specified magnitude. For example, ' +
        'a value of 2 means that shapes will be twice their normal size. ' +
        'You can set a magnitude in both the x (width) and y (height) dimensions.'
    );
    this.setHelpUrl('');
  },
};

Blockly.Blocks['graphics_font'] = {
  init() {
    let FONTS = [
      ['Arial', 'ARIAL'],
      ['Courier New', 'COURIER_NEW'],
      ['Helvetica', 'HELVETICA'],
      ['Times New Roman', 'TIMES_NEW_ROMAN'],
      ['Verdana', 'VERDANA'],
    ];

    this.setColour(Blockly.Msg.GRAPHICS_HUE);
    this.appendValueInput('SIZE')
      .setCheck('Number')
      .setAlign(Blockly.ALIGN_RIGHT)
      .appendField('set display font to')
      .appendField(new Blockly.FieldDropdown(FONTS), 'FAMILY')
      .appendField('with')
      .appendField('size');
    this.setInputsInline(true);
    this.setPreviousStatement(true);
    this.setNextStatement(true);
    this.setTooltip(
      'Set the font family and font size of text drawn on the graphics display.'
    );
    this.setHelpUrl('');
  },
};

Blockly.Blocks['graphics_repaint'] = {
  init() {
    this.setColour(Blockly.Msg.GRAPHICS_HUE);
    this.appendDummyInput().appendField('repaint the display');
    this.setPreviousStatement(true);
    this.setNextStatement(true);
    this.setTooltip('Repaint the display with any graphics updates.');
    this.setHelpUrl('');
  },
};
