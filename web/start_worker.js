import { EventEmitter } from 'events';

self.console = function() {
  postMessage({ type: 'log', data: [].slice.call(arguments, 0) });
};

self.console.log = self.console;

self.onmessage = function (e) {
  var msg = e.data;
  if (msg.init) {
    self.sender = new Sender();
    self.main = new StartWorker(sender);
  } else if (msg.event && sender) {
    console.log(JSON.stringify(msg.data));
    sender.emit(msg.event, msg.data);
  }
};

class Sender extends EventEmitter {
  notify(name, data) {
    postMessage({
      type: "event",
      name: name,
      data: data
    });
  }
}

class Mirror {
  constructor(sender) {
    this.sender = sender;

    sender.on('change', (e) => {
      this.onUpdate();
    });
  }
}

export class StartWorker extends Mirror {
  onUpdate() {
    this.sender.notify('lint', [{ row:0,column:0,text:'An error!',type:'error' }]);
  }
}
