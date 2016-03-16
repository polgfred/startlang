'use strict';

import { $ } from 'meteor/jquery';
import React from 'react';
import ReactDOM from 'react-dom';

import brace from 'brace';
import 'brace/mode/text';
import 'brace/theme/textmate';

import CBase from './base';

import StartMode from '../brace_start/start_mode';

export default class CEditor extends CBase {
  constructor(props) {
    super(props);
    this.onClick = this.onClick.bind(this);
  }

  render() {
    return <div className="start-editor-wrapper">
      <div className="start-editor"></div>
      <button className="start-runner" onClick={ this.onClick }>Run</button>
    </div>;
  }

  componentDidMount() {
    let editor = ace.edit(this.$('.start-editor')[0]);
    editor.$blockScrolling = Infinity;
    editor.setTheme('ace/theme/textmate');
    editor.setShowFoldWidgets(false);
    editor.getSession().setTabSize(2);
    editor.getSession().setUseSoftTabs(true);
    editor.getSession().setMode(new StartMode());
  }

  onClick() {
    let editor = ace.edit(this.$('.start-editor')[0]);
    console.log(editor.getValue());
  }
}
