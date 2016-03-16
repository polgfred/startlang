'use strict';

import { $ } from 'meteor/jquery';
import React from 'react';
import ReactDOM from 'react-dom';

import immutable from 'immutable';

import CBase from './base';
import CTerm from './term';
import CGraphics from './graphics';
import CEditor from './editor';

export default class CApp extends CBase {
  render() {
    return <div className="start-app">
      <div className="start-display">
        <div className="start-graphics">
          <CGraphics data={{ shapes: immutable.List() }}/>
        </div>
        <div className="start-text">
          <CTerm buf={ immutable.List() }/>
        </div>
      </div>
      <div className="start-sidebar">
        <CEditor />
        <button className="start-runner">Run</button>
      </div>
    </div>;
  }
}
