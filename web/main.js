var $ = window.jQuery = require('jquery'),
    ace = require('brace'),
    parser = require('../parser'),
    runtime = require('../runtime'),
    graphics = require('../graphics'),
    interpreter = require('../interpreter');

require('brace/mode/pascal');
require('../term');

window.editor = ace.edit('editor');
editor.setTheme('ace/theme/textmate');
editor.setShowFoldWidgets(false);
editor.getSession().setTabSize(2);
editor.getSession().setUseSoftTabs(true);
editor.getSession().setMode('ace/mode/pascal');

window.terminal = $('#terminal').term({ prompt: '> ' });
var termapi = terminal.data('term');

function refresh() {
  return new Promise(function(resolve) {
    setTimeout(resolve, 0);
  });
}

// override print to output to the terminal

runtime.globals.print = function() {
  if (arguments.length > 0) {
    Array.prototype.forEach.call(arguments, function(arg) {
      termapi.echo(runtime.handle(arg).repr(arg));
    });
  } else {
    termapi.echo('');
  }
  // yield to UI for redraw
  return refresh();
};

runtime.globals.clear = function() {
  termapi.clear();
  // yield to UI for redraw
  return refresh();
};

// wire it up

var ctx = runtime.create(),
    session = editor.getSession(),
    doc = session.getDocument(),
    buffer = [],
    level = 1,
    prefix = '>>>>>>>>>>';

// hook up the run button
$('#runner').click(function() {
  // wipe stuff clean and make a fresh program context
  ctx = runtime.create();
  termapi.clear();
  graphics.SShape.paper.clear();
  // execute the code in the buffer
  var root = parser.parse(doc.getAllLines().join('\n')),
      interp = interpreter.create(root, ctx);
  interp.on('error', function(err) {
    termapi.error('[ERROR]: ' + err.message);
    termapi.focus();
  });
  interp.on('end', function() {
    termapi.focus();
  });
  interp.run();
});

termapi.on('line', function(command) {
  if (command) {
    buffer.push(command);
    // see if we're going into a nested block
    if (/(?:do|then|else)\s*$/.test(command)) {
      level++;
      termapi.setPrompt(prefix.substr(0, level) + ' ');
    }
    // see if we're exiting a nested block
    if (/end\s*$/.test(command)) {
      level--;
      termapi.setPrompt(prefix.substr(0, level) + ' ');
    }
    // if we're nested, don't evaluate
    if (level > 1) {
      return;
    }
    // execute the code in the buffer
    var root = parser.parse(buffer.join('\n') + '\n'),
        interp = interpreter.create(root, ctx);
    interp.on('error', function(err) {
      termapi.error('[ERROR]: ' + err.message);
      // reset the command buffer
      buffer = [];
    });
    interp.on('end', function(err) {
      // add command to the editor
      doc.insertLines(doc.getLength() - 1, buffer);
      // reset the command buffer
      buffer = [];
    });
    interp.run();
  }
});
