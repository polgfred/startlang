var $ = require('jquery'),
    util = require('util'),
    events = require('events');

function Term(el) {
  var _this = this;

  _this.el = el;
  _this.output = el.find('.terminal-output'),
  _this.text = el.find('.terminal-text');

  _this.text.keyup(function(ev) {
    if (ev.keyCode == 13) {
      _this.output.append($('<div>').append('> ' + _this.text.val()));
      _this.emit('line', _this.text.val());
      _this.text.val('');
    }
  });

  _this.el.click(function() {
    _this.focus();
  });
}

util.inherits(Term, events.EventEmitter);

util._extend(Term.prototype, {
  focus: function() {
    this.el.scrollTop(this.el.prop('scrollHeight'));
    this.text.focus();
  },

  echo: function(val) {
    this.output.append($('<div class="terminal-output-line">').append(val));
    this.focus();
  },

  error: function(val) {
    this.output.append($('<div class="terminal-output-error">').append(val));
    this.focus();
  },

  clear: function() {
    this.output.empty();
    this.focus();
  }
});

$.fn.term = function() {
  return this.each(function() {
    var el = $(this);
    el.data('term', new Term(el));
  });
};
