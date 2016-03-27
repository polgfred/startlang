'use strict';

import React from 'react';

import { SBuilder } from '../../lang/builder';
import Blockly from '../../blockly_start';

import CBase from './base';

export default class CBuilder extends CBase {
  shouldComponentUpdate(nextProps) {
    return false;
  }

  render() {
    return <div className="start-editor" />;
  }

  componentDidMount() {
    Blockly.inject($('.start-editor')[0], {
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
        minScale: 0.1,
        scaleSpeed: 1.1
      }
    });

    Blockly.Xml.domToWorkspace(
      Blockly.getMainWorkspace(),
      $('#start-blockly-workspace')[0]);
  }

  getRoot() {
    return new SBuilder().fromWorkspace(Blockly.getMainWorkspace());
  }
}
