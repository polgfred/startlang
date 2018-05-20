import React, { Component } from 'react';
import ReactDOM from 'react-dom';

import brace from 'brace';
import 'brace/mode/text';
import 'brace/theme/textmate';

import parser from '../lang/parser.pegjs';
import StartMode from '../ace/start_mode';

export default class Editor extends Component {
  shouldComponentUpdate(nextProps) {
    return false;
  }

  render() {
    return <div className="start-editor" />;
  }

  get editor() {
    return ace.edit(ReactDOM.findDOMNode(this));
  }

  componentDidMount() {
    let editor = this.editor;
    editor.$blockScrolling = Infinity;
    editor.setTheme('ace/theme/textmate');
    editor.setShowFoldWidgets(false);
    editor.setShowPrintMargin(false);
    editor.getSession().setTabSize(2);
    editor.getSession().setUseSoftTabs(true);
    editor.getSession().setMode(new StartMode());
  }

  componentWillUnmount() {
    this.editor.destroy();
  }

  getRoot() {
    return parser.parse(this.editor.getValue() + '\n');
  }
}
