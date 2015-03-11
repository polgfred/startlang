var $ = require('jquery'),
    util = require('util'),
    events = require('events');

function Term(el, options) {
  var _this = this;

  _this.el = el;
  _this.output = el.find('.terminal-output');
  _this.prompt = el.find('.terminal-prompt');
  _this.text = el.find('.terminal-text');

  if (options) {
    _this.setPrompt(options.prompt);
  }

  _this.text.keyup(function(ev) {
    if (ev.keyCode == 13) {
      _this.output.append($('<div>').append(_this.p + _this.text.val()));
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
  setPrompt: function(p) {
    this.p = p;
    this.prompt.text(p);
    this.text.css('width', 'calc(100% - ' + (this.prompt.width() + 20) + 'px)');
  },

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

$.fn.term = function(options) {
  return this.each(function() {
    var el = $(this);
    el.data('term', new Term(el, options));
  });
};
