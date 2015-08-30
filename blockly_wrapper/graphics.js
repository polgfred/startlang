'use strict';

let Blockly = require('node-blockly/lib/blockly_compressed');

// TODO: graphics (canvas) ?

// TODO: graphics (SVG)
//    change the opacity of %1 to percent
//    make a copy of %1
//    remove %1 from the screen

Blockly.Blocks['graphics_create_rect'] = {
  init: function() {
    this.setColour(Blockly.Blocks.graphics.HUE);
    this.appendValueInput('X')
        .setCheck('Number')
        .setAlign(Blockly.ALIGN_RIGHT)
        .appendField('box at')
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
    this.setOutput(true, 'Shape');
    this.setTooltip('Display a rectangle with the upper left corner at (x, y), having the specified width and height.');
    this.setHelpUrl('');
  }
};

Blockly.Blocks['graphics_create_circle'] = {
  init: function() {
    this.setColour(Blockly.Blocks.graphics.HUE);
    this.appendValueInput('X')
        .setCheck('Number')
        .setAlign(Blockly.ALIGN_RIGHT)
        .appendField('circle at')
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
    this.setOutput(true, 'Shape');
    this.setTooltip('Display a circle with the center at (x, y), having the specified radius.');
    this.setHelpUrl('');
  }
};

Blockly.Blocks['graphics_create_ellipse'] = {
  init: function() {
    this.setColour(Blockly.Blocks.graphics.HUE);
    this.appendValueInput('X')
        .setCheck('Number')
        .setAlign(Blockly.ALIGN_RIGHT)
        .appendField('ellipse at')
        .appendField('x');
    this.appendValueInput('Y')
        .setCheck('Number')
        .setAlign(Blockly.ALIGN_RIGHT)
        .appendField('y');
    this.appendValueInput('XRADIUS')
        .setCheck('Number')
        .setAlign(Blockly.ALIGN_RIGHT)
        .appendField('x-radius');
    this.appendValueInput('YRADIUS')
        .setCheck('Number')
        .setAlign(Blockly.ALIGN_RIGHT)
        .appendField('y-radius');
    this.setInputsInline(true);
    this.setOutput(true, 'Shape');
    this.setTooltip('Display an ellipse (oval) with the center at (x, y), having the specified radii.');
    this.setHelpUrl('');
  }
};

Blockly.Blocks['graphics_create_line'] = {
  init: function() {
    this.setColour(Blockly.Blocks.graphics.HUE);
    this.appendValueInput('X1')
        .setCheck('Number')
        .setAlign(Blockly.ALIGN_RIGHT)
        .appendField('line from')
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
    this.setOutput(true, 'Shape');
    this.setTooltip('Display a line from (x1, y1) to (x2, y2).');
    this.setHelpUrl('');
  }
};

Blockly.Blocks['graphics_move_shape'] = {
  init: function() {
    this.setColour(Blockly.Blocks.graphics.HUE);
    this.appendValueInput('SHAPE')
        .setCheck('Shape')
        .setAlign(Blockly.ALIGN_RIGHT)
        .appendField('move shape')
    this.appendValueInput('X')
        .setCheck('Number')
        .setAlign(Blockly.ALIGN_RIGHT)
        .appendField('to')
        .appendField('x');
    this.appendValueInput('Y')
        .setCheck('Number')
        .setAlign(Blockly.ALIGN_RIGHT)
        .appendField('y');
    this.setInputsInline(true);
    this.setPreviousStatement(true);
    this.setNextStatement(true);
    this.setTooltip('Move a shape to the coordinates (x, y).');
    this.setHelpUrl('');
  }
};

Blockly.Blocks['graphics_outline_shape'] = {
  init: function() {
    this.setColour(Blockly.Blocks.graphics.HUE);
    this.appendValueInput('SHAPE')
        .setCheck('Shape')
        .setAlign(Blockly.ALIGN_RIGHT)
        .appendField('outline shape')
    this.appendValueInput('COLOR')
        .setCheck('Colour')
        .setAlign(Blockly.ALIGN_RIGHT)
        .appendField('with color');
    this.setInputsInline(true);
    this.setPreviousStatement(true);
    this.setNextStatement(true);
    this.setTooltip('Outline a shape with the specified color.');
    this.setHelpUrl('');
  }
};

Blockly.Blocks['graphics_fill_shape'] = {
  init: function() {
    this.setColour(Blockly.Blocks.graphics.HUE);
    this.appendValueInput('SHAPE')
        .setCheck('Shape')
        .setAlign(Blockly.ALIGN_RIGHT)
        .appendField('fill shape')
    this.appendValueInput('COLOR')
        .setCheck('Colour')
        .setAlign(Blockly.ALIGN_RIGHT)
        .appendField('with color');
    this.setInputsInline(true);
    this.setPreviousStatement(true);
    this.setNextStatement(true);
    this.setTooltip('Fill a shape with the specified color.');
    this.setHelpUrl('');
  }
};

Blockly.Blocks['graphics_rotate_shape'] = {
  init: function() {
    this.setColour(Blockly.Blocks.graphics.HUE);
    this.appendValueInput('SHAPE')
        .setCheck('Shape')
        .setAlign(Blockly.ALIGN_RIGHT)
        .appendField('rotate shape')
    this.appendValueInput('ANGLE')
        .setCheck('Number')
        .setAlign(Blockly.ALIGN_RIGHT)
        .appendField('by angle');
    this.setInputsInline(true);
    this.setPreviousStatement(true);
    this.setNextStatement(true);
    this.setTooltip('Rotate a shape by the specified angle.');
    this.setHelpUrl('');
  }
};

Blockly.Blocks['graphics_scale_shape'] = {
  init: function() {
    this.setColour(Blockly.Blocks.graphics.HUE);
    this.appendValueInput('SHAPE')
        .setCheck('Shape')
        .setAlign(Blockly.ALIGN_RIGHT)
        .appendField('scale shape');
    this.appendValueInput('MULTX')
        .setCheck('number')
        .setAlign(Blockly.ALIGN_RIGHT)
        .appendField('width by');
    this.appendValueInput('MULTY')
        .setCheck('number')
        .setAlign(Blockly.ALIGN_RIGHT)
        .appendField('height by');
    this.setInputsInline(true);
    this.setPreviousStatement(true);
    this.setNextStatement(true);
    this.setTooltip('Scale a shape by the specified magnitude.');
    this.setHelpUrl('');
  }
};

Blockly.Blocks['graphics_refresh'] = {
  init: function() {
    this.setColour(Blockly.Blocks.graphics.HUE);
    this.appendDummyInput()
        .appendField('refresh display');
    this.setPreviousStatement(true);
    this.setNextStatement(true);
    this.setTooltip('Force pending graphics updates to the screen.');
    this.setHelpUrl('');
  }
};
