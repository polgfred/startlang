'use client';

import brace from 'brace';
import { useEffect, useRef } from 'react';

// import 'brace/mode/text.js';
// import 'brace/theme/github.js';

import StartMode from '../../src/ace/start_mode.js';
import { parse } from '../../src/lang/parser.peggy';

export default function Editor({ setParser }) {
  const ref = useRef();

  useEffect(() => {
    if (!ref.current) {
      return;
    }

    const editor = brace.edit(ref.current);
    const session = editor.getSession();

    editor.$blockScrolling = Infinity;
    // editor.setTheme('ace/theme/github');
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
      sx={{
        fontFamily: 'Roboto Mono',
        fontSize: 14,
        height: '100%',
      }}
    />
  );
}
