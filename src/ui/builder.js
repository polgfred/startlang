import React, { Component } from 'react';

import { SBuilder } from '../lang/builder';
import Blockly from '../blockly';

import toolbox from './toolbox.xml';

export default class Builder extends Component {
  shouldComponentUpdate(nextProps) {
    return false;
  }

  render() {
    return <div className="start-builder" />;
  }

  componentDidMount() {
    this.blockly = Blockly.inject(ReactDOM.findDOMNode(this), {
      toolbox,
      collapse: true,
      comments: true,
      disable: true,
      readOnly: false,
      scrollbars: true,
      trashcan: true,
      media: './dist/blockly/media/',
      grid: {
        spacing: 25,
        length: 3,
        colour: '#ccc',
        snap: true
      },
      zoom: {
        enabled: true,
        controls: true,
        wheel: false,
        maxScale: 2,
        minScale: 0.5,
        scaleSpeed: 1.1
      }
    });
  }

  componentWillUnmount() {
    this.blockly.dispose();
  }

  getRoot() {
    return new SBuilder().fromWorkspace(Blockly.getMainWorkspace());
  }
}
