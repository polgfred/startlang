import React, { useEffect, useRef } from 'react';

import brace from 'brace';
import 'brace/mode/text';
import 'brace/theme/github';

import parser from '../lang/parser.pegjs';
import StartMode from '../ace/start_mode';

export default function Editor({ setParser }) {
  const ref = useRef();

  useEffect(() => {
    const editor = brace.edit(ref.current);

    editor.$blockScrolling = Infinity;
    editor.setTheme('ace/theme/github');
    editor.setShowFoldWidgets(false);
    editor.setShowPrintMargin(false);
    editor.getSession().setTabSize(2);
    editor.getSession().setUseSoftTabs(true);
    editor.getSession().setMode(new StartMode());

    setParser(() => {
      return () => {
        return parser.parse(editor.getValue() + '\n');
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
