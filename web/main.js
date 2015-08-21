import $ from 'jquery';

import Blockly from '../blockly_wrapper';
import Astgen from '../astgen';

// import { parse } from '../parser';
import { createRuntime, globals, handle } from '../runtime';
import { createInterpreter } from '../interpreter';
import { paper } from '../graphics';

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
  return refresh();
};

globals.input = function(message) {
  return prompt(message);
};

globals.clear = function() {
  //termapi.clear();
  paper.clear();
  // yield to UI for redraw
  return refresh();
};

// wire it up

Blockly.inject($('#editor')[0], { toolbox: $('#toolbox')[0] });
//Blockly.Xml.domToWorkspace(Blockly.getMainWorkspace(), $('#expr')[0]);

let ctx = createRuntime(),
    gen = new Astgen();

// hook up the run button
$('#runner').click(() => {
  // wipe stuff clean and make a fresh program context
  ctx = createRuntime();
  // termapi.clear();
  paper.clear();
  // execute the code in the buffer
  let block = Blockly.getMainWorkspace().getTopBlocks()[0],
      root = gen.handleStatements(block),
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
