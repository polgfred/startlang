import React, { useEffect, useRef } from 'react';

import brace from 'brace';
import 'brace/mode/text';
import 'brace/theme/github';

import { parse } from '../lang/parser.pegjs';
import StartMode from '../ace/start_mode';

export default function Editor({ setParser }) {
  const ref = useRef();

  useEffect(() => {
    const editor = brace.edit(ref.current);
    const session = editor.getSession();

    editor.$blockScrolling = Infinity;
    editor.setTheme('ace/theme/github');
    editor.setShowFoldWidgets(false);
    editor.setShowPrintMargin(false);
    session.setTabSize(2);
    session.setUseSoftTabs(true);
    session.setMode(new StartMode());

    setParser((/* parser */) => {
      return () => {
        return parse(editor.getValue() + '\n');
      };
    });

    return () => {
      editor.destroy();
    };
  }, [setParser]);

  return (
    <div
      ref={ref}
      className="start-editor"
      style={{
        fontFamily: 'Roboto Mono',
        fontSize: 14,
        height: '100%',
      }}
    />
  );
}
