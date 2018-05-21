import React, {
  Component,
  createRef,
} from 'react';

import brace from 'brace';
import 'brace/mode/text';
import 'brace/theme/textmate';

import parser from '../lang/parser.pegjs';
import StartMode from '../ace/start_mode';

export default class Editor extends Component {
  constructor(props) {
    super(props);

    this.editorRef = createRef();
  }

  shouldComponentUpdate(nextProps) {
    return false;
  }

  render() {
    return (
      <div
        ref={ this.editorRef }
        className="start-editor"
        style={{
          height: '100%'
        }}
      />
    );
  }

  componentDidMount() {
    let editor = this.editor = ace.edit(this.editorRef.current);

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
