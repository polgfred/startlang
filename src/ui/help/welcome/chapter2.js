import React from 'react';

import Node from '../node';

export default class Chapter2 extends Node {
  static get defaultProps() {
    return {
      title: "Chapter 2"
    };
  }

  renderBody() {
    return <div className="start-help-body">
      <p>Placeholder text</p>
    </div>;
  }
}
