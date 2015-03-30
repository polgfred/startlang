import ace, { acequire } from 'brace';

let { Mode: TextMode } = acequire('ace/mode/text');
let { TextHighlightRules } = acequire('ace/mode/text_highlight_rules');

class StartHighlightRules extends TextHighlightRules {
  constructor() {
    super();

    this.$rules = {
      start: [
        {
          token: 'keyword',
          regex: /\b(?:if|then|else|end|for|in|do|while|begin|break|next|return|let|and|or|not)\b/
        }, {
          token: 'constant.language',
          regex: /\b(?:none|true|false|infinity)\b/
        }, {
          token: 'keyword.operator',
          regex: /[,+\-*/%!=<>&|~()\[\]]/
        }, {
          token: 'constant.numeric',
          regex: /\b(?:\d+(\.\d+)?([eE][\-+]?\d+)?)\b/
        }, {
          token: 'comment',
          regex: /;.*(?=$)/
        }, {
          token: 'string',
          regex: /"/,
          push: 'string'
        }, {
          token: 'keyword.operator',
          regex: /`/,
          next: 'pop'
        }
      ],
      string: [
        {
          token: 'string',
          regex: /""/
        }, {
          token: 'keyword.operator',
          regex: /`/,
          push: 'start'
        }, {
          token: 'string',
          regex: /"/,
          next: 'pop'
        }, {
          defaultToken: 'string'
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
