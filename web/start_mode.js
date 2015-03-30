import ace, { acequire } from 'brace';

let { Mode: TextMode } = acequire('ace/mode/text');
let { TextHighlightRules } = acequire('ace/mode/text_highlight_rules');

class StartHighlightRules extends TextHighlightRules {
  constructor() {
    super();

    this.$rules = {
      start: [
        {
          token: 'keyword.control.start',
          regex: /\b(?:if|else|end|for|in|do|while|begin|break|next|return|let)\b/
        }, {
          token: 'keyword.start',
          regex: /\b(?:and|or|not)\b/
        }, {
          token: 'constant.language.start',
          regex: /\b(?:none|true|false|infinity)\b/
        }, {
          token: 'punctuation.operator.start',
          regex: /(?:,|\+|\-|\/|\*|\*\*|%|=|!=|<|<=|>|>=|&|\||~)/
        }, {
          token: 'punctuation.paren.start',
          regex: /(?:\(|\[|\)|\])/
        }, {
          token: 'identifier.start',
          regex: /\b(?:\w+)\b/
        }, {
          token: 'constant.numeric.start',
          regex: /\b(?:\d+(\.\d+)?([eE][\-+]?\d+)?)\b/
        }, {
          token: 'comment.start',
          regex: /;.*(?=$)/
        }, {
          token: 'constant.string.start',
          regex: /"/,
          push: 'string'
        }, {
          token: 'punctuation.quote.start',
          regex: /`/,
          next: 'pop'
        }
      ],
      string: [
        {
          token: 'constant.string.start',
          regex: /""/
        }, {
          token: 'punctuation.quote.start',
          regex: /`/,
          push: 'start'
        }, {
          token: 'constant.string.start',
          regex: /"/,
          next: 'pop'
        }, {
          defaultToken: 'constant.string.start'
        }
      ]
    };

    this.normalizeRules();
  }
}

export default class Mode extends TextMode {
  constructor() {
    super();

    this.HighlightRules = StartHighlightRules;

    this.lineCommentStart = [';'];
  }
}
