import $ from 'jquery';
import ace from 'brace';
import 'brace/mode/pascal';
import { parse } from '../parser';
import { createRuntime, globals, handle } from '../runtime';
import { createInterpreter } from '../interpreter';
import { paper } from '../graphics';
import '../term';

export const editor = ace.edit('editor');
editor.setTheme('ace/theme/textmate');
editor.setShowFoldWidgets(false);
editor.getSession().setTabSize(2);
editor.getSession().setUseSoftTabs(true);
editor.getSession().setMode('ace/mode/pascal');

export const terminal = $('#terminal').term({ prompt: '> ' });
var termapi = terminal.data('term');

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

let ctx = createRuntime(),
    session = editor.getSession(),
    doc = session.getDocument(),
    buffer = [],
    level = 1;

// hook up the run button
$('#runner').click(() => {
  // wipe stuff clean and make a fresh program context
  ctx = createRuntime();
  termapi.clear();
  paper.clear();
  // execute the code in the buffer
  let root = parse(doc.getAllLines().join('\n')),
      interp = createInterpreter(root, ctx);
  interp.on('error', (err) => {
    termapi.error('[ERROR]: ' + err.message);
    termapi.focus();
  });
  interp.on('end', () => {
    termapi.focus();
  });
  interp.run();
});

termapi.on('line', (command) => {
  if (command) {
    buffer.push(command);
    // see if we're going into a nested block
    if (/(?:do|then|else)\s*$/.test(command)) {
      level++;
      termapi.prompt = '>'.repeat(level) + ' ';
    }
    // see if we're exiting a nested block
    if (/end\s*$/.test(command)) {
      level--;
      termapi.prompt = '>'.repeat(level) + ' ';
    }
    // if we're nested, don't evaluate
    if (level > 1) {
      return;
    }
    // execute the code in the buffer
    let root = parse(buffer.join('\n') + '\n'),
        interp = createInterpreter(root, ctx);
    interp.on('error', (err) => {
      termapi.error('[ERROR]: ' + err.message);
      // reset the command buffer
      buffer = [];
    });
    interp.on('end', () => {
      // add command to the editor
      doc.insertLines(doc.getLength() - 1, buffer);
      // reset the command buffer
      buffer = [];
    });
    interp.run();
  }
});
