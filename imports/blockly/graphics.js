'use strict';

let Blockly = require('node-blockly/lib/blockly_compressed');

Blockly.Blocks['graphics_rect'] = {
  init: function() {
    this.setColour(Blockly.Blocks.graphics.HUE);
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
    this.setPreviousStatement(true);
    this.setNextStatement(true);
    this.setTooltip('Display a rectangle with the upper left corner at (x, y), having the specified width and height.');
    this.setHelpUrl('');
  }
};

Blockly.Blocks['graphics_circle'] = {
  init: function() {
    this.setColour(Blockly.Blocks.graphics.HUE);
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
    this.setPreviousStatement(true);
    this.setNextStatement(true);
    this.setTooltip('Display a circle with the center at (x, y), having the specified radius.');
    this.setHelpUrl('');
  }
};

Blockly.Blocks['graphics_ellipse'] = {
  init: function() {
    this.setColour(Blockly.Blocks.graphics.HUE);
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
        .appendField('x-radius');
    this.appendValueInput('YRADIUS')
        .setCheck('Number')
        .setAlign(Blockly.ALIGN_RIGHT)
        .appendField('y-radius');
    this.setPreviousStatement(true);
    this.setNextStatement(true);
    this.setTooltip('Display an ellipse (oval) with the center at (x, y), having the specified radii.');
    this.setHelpUrl('');
  }
};

Blockly.Blocks['graphics_line'] = {
  init: function() {
    this.setColour(Blockly.Blocks.graphics.HUE);
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
    this.setPreviousStatement(true);
    this.setNextStatement(true);
    this.setTooltip('Display a line from (x1, y1) to (x2, y2).');
    this.setHelpUrl('');
  }
};

Blockly.Blocks['graphics_stroke'] = {
  init: function() {
    this.setColour(Blockly.Blocks.graphics.HUE);
    this.appendValueInput('COLOR')
        .setCheck('Colour')
        .setAlign(Blockly.ALIGN_RIGHT)
        .appendField('set outline color to');
    this.setInputsInline(true);
    this.setPreviousStatement(true);
    this.setNextStatement(true);
    this.setTooltip('Set the shape outline (stroke) to the specified color.');
    this.setHelpUrl('');
  }
};

Blockly.Blocks['graphics_fill'] = {
  init: function() {
    this.setColour(Blockly.Blocks.graphics.HUE);
    this.appendValueInput('COLOR')
        .setCheck('Colour')
        .setAlign(Blockly.ALIGN_RIGHT)
        .appendField('set fill color to');
    this.setInputsInline(true);
    this.setPreviousStatement(true);
    this.setNextStatement(true);
    this.setTooltip('Set the shape fill color to the specified color.');
    this.setHelpUrl('');
  }
};

Blockly.Blocks['graphics_opacity'] = {
  init: function() {
    this.setColour(Blockly.Blocks.graphics.HUE);
    this.appendValueInput('AMOUNT')
        .setCheck('Number')
        .setAlign(Blockly.ALIGN_RIGHT)
        .appendField('set opacity to');
    this.setInputsInline(true);
    this.setPreviousStatement(true);
    this.setNextStatement(true);
    this.setTooltip('Set the shape opacity. ' +
                    'The value can be anything from 0 (completely transparent) ' +
                    'to 1 (completely solid).');
    this.setHelpUrl('');
  }
};

Blockly.Blocks['graphics_rotate'] = {
  init: function() {
    this.setColour(Blockly.Blocks.graphics.HUE);
    this.appendValueInput('ANGLE')
        .setCheck('Number')
        .setAlign(Blockly.ALIGN_RIGHT)
        .appendField('set angle of rotation to');
    this.setInputsInline(true);
    this.setPreviousStatement(true);
    this.setNextStatement(true);
    this.setTooltip('Set the angle of rotation to the specified angle.');
    this.setHelpUrl('');
  }
};

Blockly.Blocks['graphics_scale'] = {
  init: function() {
    this.setColour(Blockly.Blocks.graphics.HUE);
    this.appendValueInput('MULTX')
        .setCheck('Number')
        .setAlign(Blockly.ALIGN_RIGHT)
        .appendField('set scale factor to x');
    this.appendValueInput('MULTY')
        .setCheck('Number')
        .setAlign(Blockly.ALIGN_RIGHT)
        .appendField('y');
    this.setInputsInline(true);
    this.setPreviousStatement(true);
    this.setNextStatement(true);
    this.setTooltip('Set the scale factor to the specified magnitude. For example, ' +
                    'a value of 2 means that shapes will be twice their normal size. ' +
                    'You can set a magnitude in both the x (width) and y (height) dimensions.');
    this.setHelpUrl('');
  }
};

Blockly.Blocks['graphics_repaint'] = {
  init: function() {
    this.setColour(Blockly.Blocks.graphics.HUE);
    this.appendDummyInput()
        .appendField('repaint the display');
    this.setPreviousStatement(true);
    this.setNextStatement(true);
    this.setTooltip('Repaint the display with any graphics updates.');
    this.setHelpUrl('');
  }
};
