// wrap up and extend the blockly stuff, and expose it like a proper ES6 module

import './msg';
import './control';
import './math';
import './time';
import './lists';
import './tables';
import './graphics';

// setup our color scheme
Blockly.Blocks.control = {};
Blockly.Blocks.time = {};
Blockly.Blocks.colour = {};
Blockly.Blocks.graphics = {};
Blockly.Blocks.control.HUE = 290;
Blockly.Blocks.time.HUE = 0;
Blockly.Blocks.colour.HUE = 180;
Blockly.Blocks.graphics.HUE = 180;

// internally, requiring 'blockly' will configure stuff and return the global object
export default Blockly;
