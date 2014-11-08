require([
  'jquery',
  'jquery.terminal',
  'ace/ace',
  'start-lang',
  'start-lib'
], function($, _, ace, startlang, startlib) {

  window.prompt = ace.edit('prompt');
  prompt.setTheme('ace/theme/textmate');
  prompt.setShowFoldWidgets(false);
  prompt.getSession().setTabSize(2);
  prompt.getSession().setUseSoftTabs(true);
  prompt.getSession().setMode('ace/mode/pascal');

  window.terminal = $('#terminal-inner');
  terminal.terminal(function(command) {
    console.log(command);
    terminal.pause();
  }, {
    greetings: false,
    height: 400,
    prompt: '> '
  });
  terminal.pause();

  // override print to output to the terminal

  startlib._globals.print = function() {
    if (arguments.length > 0) {
      Array.prototype.forEach.call(arguments, function(arg) {
        terminal.echo(startlib._handle(arg).repr(arg), {
          finalize: function(div) {
            div.addClass('output').prepend('<span>&#8702;</span>');
          }
        });
      });
    } else {
      terminal.echo();
    }
  };

  startlib._globals.clear = function() {
    terminal.clear();
  };

  // wire it up

  var ctx = startlib.createEnv(),
      runCommand = function() {
        var command = prompt.getValue().trim();

        if (command) {
          terminal.echo(command, {
            finalize: function(div) {
              div.addClass('input').prepend('<span>&#8701;</span>');
            }
          });
          var prog = startlang.parse(command + '\n');
          console.log(prog);
          prog.run(ctx, function() {
            terminal.echo('');
            prompt.setValue('');
            prompt.focus();
          });
        }
      };

  $('#runner').click(runCommand);

  prompt.commands.removeCommand('showSettingsMenu');
  prompt.commands.addCommand({
    name: "runSnippet",
    bindKey: {
      win: "Ctrl-Return",
      mac: "Command-Return"
    },
    exec: runCommand
  });

  prompt.focus();

});
