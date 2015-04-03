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
          row: Math.min(e.line, this.doc.getLength()) - 1,
          column: e.column,
          text: e.message,
          type: 'error'
        }]);
      }
    }
  }
}

let sender = null,
    worker = null;

self.onmessage = function ({ data: msg }) {
  if (msg.init) {
    sender = new Sender();
    worker = new StartWorker(sender);
  } else if (msg.event && sender) {
    sender._signal(msg.event, msg.data);
  }
};
