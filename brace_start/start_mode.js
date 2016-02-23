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
          regex: /\b(?:and|b(egin|reak|y)|do|e(lse|nd|xit)|f(or|rom)|i[fn]|l(et|ocal)|n(ext|ot)|or|t(hen|o)|re(peat|turn)|w(hile|ith))\b/
        }, {
          token: 'constant.language',
          regex: /\b(?:false|infinity|none|true)\b/
        }, {
          token: 'support.function',
          regex: /\b(?:a(bs|cos|dd|sin|tan|vg)|c(eil|l(amp|ear)|o(py|s))|diff|e(ndof|xp)|f(irst|loor)|in(pu|ser)t|join|keys|l(ast|en|ist|o(g|wer))|m(ax|in)|num|p(art|ow|rint|ut)|r(and|e(mov|plac|vers)e|ound|sort)|s(huffle|in|leep|ort|plit|qrt|t(artof|r)|u(b|m)|wap)|t(a(ble|n)|ime)|upper)\b/
        }, {
          token: 'support.function',
          regex: /\b(?:c(ircle|olor)|display|ellipse|fill|line|poly(gon|line)|o(pacity|rigin)|r(e(ct|fresh|paint)|otate)|scale)\b/
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
          token: 'string',
          regex: /``/
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
    var mod = { src: 'importScripts("' + location.href.replace(/main\.html.*$/, 'start_worker.js') + '")' },
        worker = new WorkerClient(['ace'], mod, 'StartWorker', 'start_worker.js');

    worker.attachToDocument(session.getDocument());

    worker.on('lint', (results) => {
      session.setAnnotations(results.data);
    });

    worker.on('terminate', () => {
      session.clearAnnotations();
    });

    return worker;
  }
}
