'use client';

import brace from 'brace';
import { useEffect, useRef } from 'react';

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
        position: 'relative',
        fontFamily: 'Roboto Mono !important',
        fontSize: '14px !important',
        height: '100%',
      }}
    />
  );
}
