'use strict';

import $ from 'meteor/jquery';

import React from 'react';
import ReactDOM from 'react-dom';

import CBase from './base';
import CTerm from './term';
import CGraphics from './graphics';
import CEditor from './editor';

export default class CApp extends CBase {
  render() {
    return <div>
      <div id="display">
        <CGraphics />
        <CTerm />
      </div>
      <div id="sidebar">
        <CEditor />
        <button id="runner">Run</button>
      </div>
    </div>;
  }
}
