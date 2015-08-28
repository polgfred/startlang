'use strict';

import $ from 'jquery';

// import { parse } from '../lang/parser';
import { createRuntime, globals, handle } from '../lang/runtime';
import { createInterpreter } from '../lang/interpreter';
import { createBuilder } from '../lang/builder';
import { paper } from '../lang/graphics';
import Blockly from '../blockly_wrapper';

function refresh() {
  return new Promise((resolve) => {
    setImmediate(resolve);
  });
}

// override print to output to the terminal

globals.print = function(...values) {
  if (values.length > 0) {
    for (let v of values) {
      console.log('[PRINT]', handle(v).repr(v));
      //termapi.echo(handle(v).repr(v));
    }
  } else {
    console.log('[PRINT]');
    //termapi.echo('');
  }
  // yield to UI for redraw
  //return refresh();
};

globals.input = function(message) {
  return prompt(message);
};

globals.clear = function() {
  console.clear();
  //termapi.clear();
  paper.clear();
  // yield to UI for redraw
  return refresh();
};

// wire it up

Blockly.inject('editor', {
  toolbox: $('#toolbox')[0],
  collapse: true,
  comments: true,
  disable: true,
  readOnly: false,
  scrollbars: true,
  trashcan: true,
  grid: {
    spacing: 25,
    length: 3,
    colour: '#ccc',
    snap: true
  },
  zoom: {
    enabled: true,
    controls: true,
    wheel: true,
    maxScale: 2,
    minScale: .1,
    scaleSpeed: 1.1
  }
});

let ctx = createRuntime();

// hook up the run button
$('#runner').click(() => {
  // wipe stuff clean and make a fresh program context
  ctx = createRuntime();
  console.clear();
  // termapi.clear();
  paper.clear();
  // execute the code in the buffer
  let block = Blockly.getMainWorkspace().getTopBlocks()[0],
      root = createBuilder().handleStatements(block),
      interp = createInterpreter(root, ctx);
  interp.on('error', (err) => {
    console.error('[ERROR]: ' + err.message);
  });
  interp.on('end', () => {
    console.log('[END]');
  });
  interp.run();
});

// make the workspace persist

$(window).on('unload', function() {
  localStorage['save'] = Blockly.Xml.domToText(Blockly.Xml.workspaceToDom(Blockly.getMainWorkspace()));
});

$(window).on('load', function() {
  if (localStorage['save']) {
    Blockly.Xml.domToWorkspace(Blockly.getMainWorkspace(), Blockly.Xml.textToDom(localStorage['save']));
  }
});
