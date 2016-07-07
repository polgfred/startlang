'use strict';

import { _ } from 'underscore';

import React from 'react';

import Base from '../base';

import Welcome from './welcome';

export default class Help extends Base {
  constructor() {
    super();

    this.state = {
      path: []
    };

    _.bindAll(this, 'updatePath');
  }

  render() {
    return <div className="start-help">
      <Welcome path={this.state.path} updatePath={this.updatePath} />
    </div>;
  }

  updatePath(path) {
    this.setState({ path });
  }
}
