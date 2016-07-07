'use strict';

import React from 'react';

import Node from '../node';

export default class Introduction extends Node {
  static get defaultProps() {
    return {
      title: "Beginning Your Adventure"
    };
  }

  renderBody() {
    return <div className="start-help-body">
      <p>
        You are about to embark on an epic adventure — programming a computer!
      </p>
      <p>
        When your parents were your age (like a zillion years ago), computers were a lot slower and clunkier than they are now. You couldn’t play super cool games like Minecraft and MarioKart. When you turned them on, they pretty much just sat and stared at you, waiting for you to tell them what to do. But that’s exactly what was so cool about them. Once you learned how to speak their language, you could make them do whatever you wanted. <strong>You were in control!</strong>
      </p>
      <p>
        Computers are everywhere today — in our cars, our phones, our music players. You might even be carrying a computer around in your pocket right now! They’re a lot faster and more powerful than they used to be, too. But one thing hasn’t changed — programming is really fun!
      </p>
      <p>
        This little booklet is here to help get you started on your adventure. We’ll jump right in with real code that you can run, change, and improve as you go along. Don’t worry if some things don’t make sense at first. There’ll be plenty of time to let everything sink in.
      </p>
    </div>;
  }
}
