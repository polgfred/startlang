'use strict';

let Blockly = require('node-blockly/lib/blockly_compressed');

// TODO: graphics (canvas) ?

// TODO: graphics (SVG)
//    change the opacity of %1 to percent
//    make a copy of %1
//    remove %1 from the screen

Blockly.Blocks['graphics_create_rect'] = {
  init: function() {
    this.jsonInit({
      id: 'graphics_create_rect',
      message0: 'rectangle with x %1 y %2 width %3 height %4',
      args0: [
        { type: 'input_value', name: 'X', check: 'Number', align: 'RIGHT' },
        { type: 'input_value', name: 'Y', check: 'Number', align: 'RIGHT' },
        { type: 'input_value', name: 'WIDTH', check: 'Number', align: 'RIGHT' },
        { type: 'input_value', name: 'HEIGHT', check: 'Number', align: 'RIGHT' }
      ],
      colour: Blockly.Blocks.colour.HUE,
      inputsInline: true,
      output: 'Shape',
      tooltip: 'Display a rectangle with the upper left corner at (x, y), having the specified width and height.',
      helpUrl: ''
    });
  }
};

Blockly.Blocks['graphics_create_circle'] = {
  init: function() {
    this.jsonInit({
      id: 'graphics_create_circle',
      message0: 'circle with x %1 y %2 radius %3',
      args0: [
        { type: 'input_value', name: 'X', check: 'Number', align: 'RIGHT' },
        { type: 'input_value', name: 'Y', check: 'Number', align: 'RIGHT' },
        { type: 'input_value', name: 'RADIUS', check: 'Number', align: 'RIGHT' }
      ],
      colour: Blockly.Blocks.colour.HUE,
      inputsInline: true,
      output: 'Shape',
      tooltip: 'Display a circle with the center at (x, y), having the specified radius.',
      helpUrl: ''
    });
  }
};

Blockly.Blocks['graphics_create_ellipse'] = {
  init: function() {
    this.jsonInit({
      id: 'graphics_create_ellipse',
      message0: 'ellipse with x %1 y %2 x-radius %3 y-radius %4',
      args0: [
        { type: 'input_value', name: 'X', check: 'Number', align: 'RIGHT' },
        { type: 'input_value', name: 'Y', check: 'Number', align: 'RIGHT' },
        { type: 'input_value', name: 'XRADIUS', check: 'Number', align: 'RIGHT' },
        { type: 'input_value', name: 'YRADIUS', check: 'Number', align: 'RIGHT' }
      ],
      colour: Blockly.Blocks.colour.HUE,
      inputsInline: true,
      output: 'Shape',
      tooltip: 'Display an ellipse (oval) with the center at (x, y), having the specified radii.',
      helpUrl: ''
    });
  }
};

Blockly.Blocks['graphics_create_line'] = {
  init: function() {
    this.jsonInit({
      id: 'graphics_create_line',
      message0: 'line from x1 %1 y1 %2 to x2 %3 y2 %4',
      args0: [
        { type: 'input_value', name: 'X1', check: 'Number', align: 'RIGHT' },
        { type: 'input_value', name: 'Y1', check: 'Number', align: 'RIGHT' },
        { type: 'input_value', name: 'X2', check: 'Number', align: 'RIGHT' },
        { type: 'input_value', name: 'Y2', check: 'Number', align: 'RIGHT' }
      ],
      colour: Blockly.Blocks.colour.HUE,
      inputsInline: true,
      output: 'Shape',
      tooltip: 'Display a line from (x1, y1) to (x2, y2).',
      helpUrl: ''
    });
  }
};

Blockly.Blocks['graphics_move_shape'] = {
  init: function() {
    this.jsonInit({
      id: 'graphics_move_shape',
      message0: 'move shape %1 to x %2 y %3',
      args0: [
        { type: 'input_value', name: 'SHAPE', check: 'Shape' },
        { type: 'input_value', name: 'X', check: 'Number', align: 'RIGHT' },
        { type: 'input_value', name: 'Y', check: 'Number', align: 'RIGHT' }
      ],
      inputsInline: true,
      previousStatement: null,
      nextStatement: null,
      colour: Blockly.Blocks.colour.HUE,
      tooltip: 'Move a shape to the coordinates (x, y).',
      helpUrl: ''
    });
  }
};

Blockly.Blocks['graphics_outline_shape'] = {
  init: function() {
    this.jsonInit({
      id: 'graphics_outline_shape',
      message0: 'outline shape %1 with color %2',
      args0: [
        { type: 'input_value', name: 'SHAPE', check: 'Shape' },
        { type: 'input_value', name: 'COLOR', check: 'Color', align: 'RIGHT' }
      ],
      inputsInline: true,
      previousStatement: null,
      nextStatement: null,
      colour: Blockly.Blocks.colour.HUE,
      tooltip: 'Outline a shape with the specified color.',
      helpUrl: ''
    });
  }
};

Blockly.Blocks['graphics_fill_shape'] = {
  init: function() {
    this.jsonInit({
      id: 'graphics_fill_shape',
      message0: 'fill shape %1 with color %2',
      args0: [
        { type: 'input_value', name: 'SHAPE', check: 'Shape' },
        { type: 'input_value', name: 'COLOR', check: 'Color', align: 'RIGHT' }
      ],
      inputsInline: true,
      previousStatement: null,
      nextStatement: null,
      colour: Blockly.Blocks.colour.HUE,
      tooltip: 'Fill a shape with the specified color.',
      helpUrl: ''
    });
  }
};

Blockly.Blocks['graphics_rotate_shape'] = {
  init: function() {
    this.jsonInit({
      id: 'graphics_rotate_shape',
      message0: 'rotate shape %1 by %2',
      args0: [
        { type: 'input_value', name: 'SHAPE', check: 'Shape' },
        { type: 'input_value', name: 'ANGLE', check: 'Number', align: 'RIGHT' }
      ],
      inputsInline: true,
      previousStatement: null,
      nextStatement: null,
      colour: Blockly.Blocks.colour.HUE,
      tooltip: 'Rotate a shape by the specified number of degrees.',
      helpUrl: ''
    });
  }
};

Blockly.Blocks['graphics_scale_shape'] = {
  init: function() {
    this.jsonInit({
      id: 'graphics_scale_shape',
      message0: 'scale shape %1 by x times %2 y times %3',
      args0: [
        { type: 'input_value', name: 'SHAPE', check: 'Shape' },
        { type: 'input_value', name: 'MULTX', check: 'Number', align: 'RIGHT' },
        { type: 'input_value', name: 'MULTY', check: 'Number', align: 'RIGHT' }
      ],
      inputsInline: true,
      previousStatement: null,
      nextStatement: null,
      colour: Blockly.Blocks.colour.HUE,
      tooltip: 'Scale a shape by some magnitude in both directions.',
      helpUrl: ''
    });
  }
};
