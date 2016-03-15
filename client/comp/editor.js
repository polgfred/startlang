'use strict';

import $ from 'meteor/jquery';

import React from 'react';
import ReactDOM from 'react-dom';

import CBase from './base';

export default class CEditor extends CBase {
  render() {
    return <div id="editor"></div>;
  }
}
