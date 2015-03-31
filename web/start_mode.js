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
          token: 'support.function',
          regex: /\b(?:list|map|swap|print|sleep|abs|acos|asin|atan|ceil|cos|exp|floor|log|round|sin|sqrt|tan|pow|max|min|random|range|len|first|last|copy|insert|delete|replace|reverse|split|upper|lower|join|sort|keys|put)\b/
        }, {
          token: 'support.function',
          regex: /\b(?:refresh|rect|circle|ellipse|line|polyline|polygon|move|fill|stroke|opacity|rotate|scale|clone|remove)\b/
        }, {
          token: 'keyword.operator',
          regex: /[,+\-*/%!=<>&|~]/
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
