var parser = require('../parser'),
    runtime = require('../runtime'),
    interpreter = require('../interpreter'),
    graphics = require('./graphics');

window.editor = ace.edit('editor');
editor.setTheme('ace/theme/textmate');
editor.setShowFoldWidgets(false);
editor.getSession().setTabSize(2);
editor.getSession().setUseSoftTabs(true);
editor.getSession().setMode('ace/mode/pascal');

window.terminal = $('#terminal-inner');

// override print to output to the terminal

runtime.globals.print = function() {
  if (arguments.length > 0) {
    Array.prototype.forEach.call(arguments, function(arg) {
      terminal.echo(runtime.handle(arg).repr(arg), {
        finalize: function(div) {
          div.addClass('bold');
        }
      });
    });
  } else {
    terminal.echo();
  }
};

runtime.globals.clear = function() {
  terminal.clear();
};

// wire it up

var ctx = runtime.create();

terminal.terminal(function(command) {
  if (command) {
    // parse and evaluate the command
    var root = parser.parse(command + '\n'),
        interp = interpreter.create(root, ctx);
    interp.on('error', function(err) {
      terminal.error('[ERROR]: ' + err.message);
    });
    interp.run();
    // add command to the buffer
    var session = editor.getSession();
    session.insert({ row: session.getLength(), column: 0 }, command + '\n');
  }
}, {
  greetings: '[[b;;]Welcome to Start!]\n',
  height: 240,
  prompt: '> '
});
