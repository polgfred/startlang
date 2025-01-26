'use client';

import Monaco from '@monaco-editor/react';
import { useCallback } from 'react';

import { parse } from '../../src/lang/parser.peggy';

export default function Editor({ setParser }) {
  const onEditorMount = useCallback(
    (editor) => {
      editor.focus();

      setParser((/* parser */) => {
        return () => {
          return parse(editor.getValue() + '\n');
        };
      });
    },
    [setParser]
  );

  return (
    <Monaco
      defaultValue={'print "Hello, World!"'}
      onMount={onEditorMount}
      options={{
        minimap: { enabled: false },
      }}
    />
  );
}
