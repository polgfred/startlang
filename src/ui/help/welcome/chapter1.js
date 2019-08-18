import React from 'react';

import Node from '../node';

export default class Chapter1 extends Node {
  static get defaultProps() {
    return {
      title: "Data"
    };
  }

  static children() {
    return [
      Numbers,
      Text
    ];
  }
}

class Numbers extends Node {
  static get defaultProps() {
    return {
      title: "Numbers"
    };
  }

  renderBody() {
    return <div className="start-help-body">
      <p>Numbers</p>
      <p>Numbers</p>
      <p>Numbers</p>
    </div>;
  }
}

class Text extends Node {
  static get defaultProps() {
    return {
      title: "Text"
    };
  }

  renderBody() {
    return <div className="start-help-body">
      <p>Text</p>
      <p>Text</p>
      <p>Text</p>
    </div>;
  }
}
