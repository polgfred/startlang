import ace, { acequire } from 'brace';

let { Mode: TextMode } = acequire('ace/mode/text');
let { TextHighlightRules } = acequire('ace/mode/text_highlight_rules');
let { WorkerClient } = acequire('ace/worker/worker_client');

class StartHighlightRules extends TextHighlightRules {
  constructor() {
    super();

    this.$rules = {
      start: [
        {
          token: 'keyword',
          regex: /\b(?:and|b(egin|reak)|do|e(lse|nd)|for|i[fn]|let|n(ext|ot)|or|return|then|while)\b/
        }, {
          token: 'constant.language',
          regex: /\b(?:false|infinity|none|true)\b/
        }, {
          token: 'support.function',
          regex: /\b(?:a(bs|cos|sin|tan)|c(eil|o(py|s))|delete|exp|f(irst|loor)|insert|join|keys|l(ast|en|ist|o(g|wer))|m(a[px]|in)|p(ow|rint|ut)|r(a(ndom|nge)|e(place|verse)|ound)|s(in|leep|ort|plit|qrt|wap)|tan|upper)\b/
        }, {
          token: 'support.function',
          regex: /\b(?:c(ircle|lone)|ellipse|fill|line|move|opacity|poly(gon|line)|r(e(ct|fresh|move)|otate)|s(cale|troke))\b/
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

  createWorker(session) {
    // only way i could figure out to interact with the npm-brace way of loading worker scripts
    var mod = { src: 'importScripts("' + location.href.replace('main.html', 'start_worker.js') + '")' },
        worker = new WorkerClient(['ace'], mod, 'StartWorker', 'start_worker.js');

    worker.attachToDocument(session.getDocument());

    worker.on('lint', function(results) {
      session.setAnnotations(results.data);
    });

    worker.on('terminate', function() {
      session.clearAnnotations();
    });

    return worker;
  }
}
