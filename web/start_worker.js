import { oop, EventEmitter, Mirror } from './worker_support';
import { parse, SyntaxError as ParseError } from '../parser';

class Sender {
  emit(name, data) {
    postMessage({
      type: "event",
      name: name,
      data: data
    });
  }
}

oop.implement(Sender.prototype, EventEmitter);

export class StartWorker extends Mirror {
  onUpdate() {
    try {
      parse(this.doc.getValue() + '\n');
      this.sender.emit('lint', []);
    } catch (e) {
      if (e instanceof ParseError) {
        this.sender.emit('lint', [{
          row: e.line - 1,
          column: e.column,
          text: e.message,
          type: 'error'
        }]);
      }
    }
  }
}

self.console = function() {
  postMessage({ type: 'log', data: [].slice.call(arguments, 0) });
};

self.console.log = self.console;

self.sender = self.main = null;

self.onmessage = function (e) {
  var msg = e.data;
  if (msg.init) {
    self.sender = new Sender();
    self.main = new StartWorker(sender);
  } else if (msg.event && sender) {
    sender._signal(msg.event, msg.data);
  }
};
