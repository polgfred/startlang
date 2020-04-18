import brace from 'brace';
import React, { useEffect, useRef } from 'react';

import 'brace/mode/text';
import 'brace/theme/github';

import StartMode from '../ace/start_mode';
import { parse } from '../lang/parser';

export default function Editor({ setParser }) {
  const ref = useRef();

  useEffect(() => {
    if (!ref.current) {
      return;
    }

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
