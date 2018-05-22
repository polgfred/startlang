import React, { Component } from 'react';

import autobind from 'autobind-decorator';

import Welcome from './welcome';

export default class Help extends Component {
  constructor() {
    super();

    this.state = {
      path: []
    };
  }

  render() {
    return <div className="start-help">
      <Welcome path={this.state.path} updatePath={this.updatePath} />
    </div>;
  }

  @autobind
  updatePath(path) {
    this.setState({ path });
  }
}
