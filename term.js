import $ from 'jquery';
import { EventEmitter } from 'events';

class Term extends EventEmitter {
  constructor(el, options) {
    this.el = el;

    if (options) {
      this.prompt = options.prompt;
    }

    this.$('.terminal-text').keyup(({ keyCode }) => {
      if (keyCode == 13) {
        this.$('.terminal-output').append($('<div>').text(this.ps + this.$('.terminal-text').val()));
        this.emit('line', this.$('.terminal-text').val());
        this.$('.terminal-text').val('');
      }
    });

    this.el.click(() => {
      this.focus();
    });
  }

  $(selector) {
    return this.el.find(selector);
  }

  set prompt(ps) {
    this.ps = ps;
    this.$('.terminal-prompt').text(ps);
    this.$('.terminal-text').css('width', 'calc(100% - ' + (this.$('.terminal-prompt').width() + 20) + 'px)');
  }

  focus() {
    this.el.scrollTop(this.el.prop('scrollHeight'));
    this.$('.terminal-text').focus();
  }

  echo(val) {
    this.$('.terminal-output').append($('<div class="terminal-output-line">').text(val));
    this.focus();
  }

  error(val) {
    this.$('.terminal-output').append($('<div class="terminal-output-error">').text(val));
    this.focus();
  }

  clear() {
    this.$('.terminal-output').empty();
    this.focus();
  }
}

$.fn.term = function(options) {
  return this.each((_, el) => {
    let el = $(el);
    el.data('term', new Term(el, options));
  });
};
