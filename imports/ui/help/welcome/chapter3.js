'use strict';

import React from 'react';

import Node from '../node';

export default class Chapter3 extends Node {
  static get defaultProps() {
    return {
      title: "Chapter 3"
    };
  }

  renderBody() {
    return <div className="start-help-body">
    </div>;
  }
}
