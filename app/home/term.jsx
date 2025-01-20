'use client';

import { Button, TextField } from '@mui/material';
import { useCallback, useLayoutEffect, useRef, useState } from 'react';

export default function Term({ buf, prompt, handleInput }) {
  const [input, setInput] = useState('');

  const handleAccept = useCallback(() => {
    handleInput(input);
    setInput('');
  }, [input, handleInput]);

  const handleChange = useCallback(
    (ev) => {
      setInput(ev.target.value);
    },
    [setInput]
  );

  const handleKeyUp = useCallback(
    (ev) => {
      if (ev.keyCode === 13) {
        handleAccept();
      }
    },
    [handleAccept]
  );

  const scrollRef = useRef();
  useLayoutEffect(() => {
    scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  });

  return (
    <div
      sx={{
        height: '100%',
      }}
    >
      <div
        style={{
          display: prompt ? 'block' : 'none',
        }}
      >
        <TextField
          type="string"
          margin="normal"
          value={input}
          label={prompt}
          onChange={handleChange}
          onKeyUp={handleKeyUp}
          autoFocus={true}
        />
        <Button
          color="primary"
          size="small"
          variant="contained"
          onClick={handleAccept}
          sx={{
            marginLeft: '12px',
          }}
        >
          OK
        </Button>
      </div>
      <div
        ref={scrollRef}
        sx={{
          fontFamily: 'Roboto',
          fontSize: '14px',
          overflow: 'scroll',
        }}
        style={{
          height: `calc(35vh - ${prompt ? 152 : 80}px)`,
        }}
      >
        <div>
          {buf.map((elem, index) => (
            <p key={index}>{elem}</p>
          ))}
        </div>
      </div>
    </div>
  );
}
