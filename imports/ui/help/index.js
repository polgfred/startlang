'use strict';

import React from 'react';

import Node from './node';

import Welcome from './welcome';

export default class Help extends Node {
  constructor() {
    super();

    this.state = {
      path: [0]
    };
  }

  render() {
    return <div className="start-help">
      <Welcome path={this.state.path} />
    </div>;
  }
}
