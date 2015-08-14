import $ from 'jquery';

import Blockly from 'node-blockly';

import { parse } from '../parser';
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
      termapi.echo(handle(v).repr(v));
    }
  } else {
    termapi.echo('');
  }
  // yield to UI for redraw
  return refresh();
};

globals.clear = function() {
  termapi.clear();
  paper.clear();
  // yield to UI for redraw
  return refresh();
};

// wire it up

Blockly.inject($('#editor')[0], { toolbox: $('#toolbox')[0] });

let ctx = createRuntime();

// hook up the run button
$('#runner').click(() => {
  // wipe stuff clean and make a fresh program context
  ctx = createRuntime();
  // termapi.clear();
  paper.clear();
  // execute the code in the buffer
  let root = parse(doc.getAllLines().join('\n')),
      interp = createInterpreter(root, ctx);
  interp.on('error', (err) => {
    // termapi.error('[ERROR]: ' + err.message);
    // termapi.focus();
  });
  interp.on('end', () => {
    // termapi.focus();
  });
  interp.run();
});
