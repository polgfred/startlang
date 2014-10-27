$(function() {

  var startlang = require('./start-lang'),
      startlib = require('./start-lib');

  window.prompt = ace.edit('prompt');
  prompt.setTheme('ace/theme/textmate');
  prompt.setShowFoldWidgets(false);
  prompt.getSession().setTabSize(2);
  prompt.getSession().setUseSoftTabs(true);
  prompt.getSession().setMode('ace/mode/pascal');

  window.terminal = $('#terminal');
  terminal.terminal(function(command) {
    console.log(command);
    terminal.pause();
  }, {
    greetings: false,
    prompt: '> '
  });
  terminal.pause();

  // override print to output to the terminal

  startlib._globals.print = function() {
    if (arguments.length > 0) {
      Array.prototype.forEach.call(arguments, function(arg) {
        terminal.echo('-> ' + startlib._handle(arg).repr(arg));
      });
    } else {
      terminal.echo();
    }
  };

  startlib._globals.clear = function() {
    terminal.clear();
  };

  // wire it up

  var env = startlib.createEnv();

  $('#runner').click(function() {
    var command = prompt.getValue().trim();

    if (command) {
      terminal.echo('[[;#888;]<- ' + command.replace(/\n/g, '\n   ').replace(/\]/g, '\\]') + ']');
      startlang.parse(command + '\n').run(env);
      terminal.echo('');
      prompt.setValue('');
      prompt.focus();
    }
  });

});
