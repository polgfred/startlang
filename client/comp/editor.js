'use strict';

import { $ } from 'meteor/jquery';
import React from 'react';
import ReactDOM from 'react-dom';

import brace from 'brace';
import 'brace/mode/text';
import 'brace/theme/textmate';

import CBase from './base';

export default class CEditor extends CBase {
  render() {
    return <div className="start-editor" />;
  }

  componentDidMount() {
    let editor = ace.edit(this.$()[0]);
    editor.$blockScrolling = Infinity;
    editor.setTheme('ace/theme/textmate');
    editor.setShowFoldWidgets(false);
    editor.getSession().setTabSize(2);
    editor.getSession().setUseSoftTabs(true);
    //editor.getSession().setMode(new StartMode());
  }
}
