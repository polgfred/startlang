'use strict';

// wrap up and extend the blockly stuff, and expose it like a proper ES6 module

import util from 'util';

import './msg';
import './math';
import './time';
import './lists';
import './tables';
import './graphics';

// import './generator';

export default Blockly = require('node-blockly/lib/blockly_compressed');

Blockly.HSV_VALUE = 0.6;

// this abomination is brought to you by the fact that requiring this module
// actully changes the value of Blockly.Blocks in the process. we need the original
// value from blockly_compressed, extended with the value from blocks_compressed,
// and then put back where we found it. don't ever write code like this.
Blockly.Blocks = util._extend(Blockly.Blocks, require('node-blockly/lib/blocks_compressed')(Blockly));
