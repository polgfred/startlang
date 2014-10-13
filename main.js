$(function() {

  var counter = 0;

  var ed = window.ed = ace.edit('console');
  ed.setTheme('ace/theme/textmate');
  ed.setShowFoldWidgets(false);
  ed.getSession().setTabSize(2);
  ed.getSession().setUseSoftTabs(true);

  var c = window.can = $('<canvas>');
  c.addClass('element');
  c.css({ top: '20px', left: '50px', width: '400px', height: '350px' });
  c.appendTo('#display');

  var t = window.term = $('<div>');
  t.addClass('element');
  t.css({ top: '400px', left: '50px', width: '380px', height: '100px' });
  t.appendTo('#display');
  t.terminal(function(command, term) {
    console.log(command);
    term.pause();
  }, {
    greetings: false,
    prompt: '> '
  });
  t.pause();
});
