'use strict';

import React from 'react';

import brace from 'brace';
import 'brace/mode/text';
import 'brace/theme/textmate';

import parser from '../../lang/parser.pegjs';
import StartMode from '../brace_start/start_mode';

import CBase from './base';

export default class CEditor extends CBase {
  shouldComponentUpdate(nextProps) {
    return false;
  }

  render() {
    return <div className="start-editor" />;
  }

  componentDidMount() {
    let editor = ace.edit(this.$()[0]);
    editor.$blockScrolling = Infinity;
    editor.setTheme('ace/theme/textmate');
    editor.setShowFoldWidgets(false);
    editor.setShowPrintMargin(false);
    editor.getSession().setTabSize(2);
    editor.getSession().setUseSoftTabs(true);
    editor.getSession().setMode(new StartMode());
  }

  getRoot() {
    let editor = ace.edit(this.$()[0]);
    return parser.parse(editor.getValue() + '\n');
  }
}
