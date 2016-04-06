'use strict';

import { $ } from 'meteor/jquery';

import React from 'react';

import { SBuilder } from '../lang/builder';
import Blockly from '../blockly';

import Base from './base';

export default class Builder extends Base {
  shouldComponentUpdate(nextProps) {
    return false;
  }

  render() {
    return <div className="start-builder" />;
  }

  componentDidMount() {
    this.blockly = Blockly.inject(this.$()[0], {
      toolbox: $('#start-blockly-toolbox')[0],
      collapse: true,
      comments: true,
      disable: true,
      readOnly: false,
      scrollbars: true,
      trashcan: true,
      media: './blockly-media/',
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

    Blockly.Xml.domToWorkspace(
      Blockly.getMainWorkspace(),
      $('#start-blockly-workspace')[0]);
  }

  componentWillUnmount() {
    this.blockly.dispose();
  }

  getRoot() {
    return new SBuilder().fromWorkspace(Blockly.getMainWorkspace());
  }
}
