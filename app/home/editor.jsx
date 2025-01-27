'use client';

import Monaco from '@monaco-editor/react';
import { useCallback } from 'react';

import { parse } from '../../src/lang/parser.peggy';
import boxScript from '../../tests/box.start';

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
      defaultValue={boxScript}
      onMount={onEditorMount}
      options={{
        minimap: { enabled: false },
      }}
    />
  );
}
