'use client';

import { useEffect, useRef } from 'react';

import { parse } from '../../src/lang/parser.peggy';

export default function Editor({ setParser }) {
  const ref = useRef();

  useEffect(() => {
    if (!ref.current) {
      return;
    }

    ref.current.focus();

    setParser((/* parser */) => {
      return () => {
        return parse(ref.current.value + '\n');
      };
    });
  }, [setParser]);

  return (
    <div
      sx={{
        position: 'relative',
        fontFamily: 'Roboto Mono !important',
        fontSize: '14px !important',
        height: '100%',
      }}
    >
      <textarea
        ref={ref}
        sx={{
          height: 'calc(100% - 20px)',
          width: 'calc(100% - 20px)',
          fontFamily: 'Roboto Mono',
          fontSize: 14,
          border: 'none',
          outline: 'none',
          resize: 'none',
          padding: '10px',
          overflow: 'auto',
        }}
      />
    </div>
  );
}
