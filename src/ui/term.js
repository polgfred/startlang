import { Button, TextField } from '@mui/material';
import React, { useCallback, useLayoutEffect, useRef, useState } from 'react';

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
      className="start-term"
      style={{
        height: '100%',
      }}
    >
      <div
        className="start-term-command"
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
          style={{
            marginLeft: '12px',
          }}
        >
          OK
        </Button>
      </div>
      <div
        ref={scrollRef}
        style={{
          fontFamily: 'Roboto',
          fontSize: '14px',
          // height: `calc(35vh - ${prompt ? 152 : 80}px)`,
          overflow: 'scroll',
        }}
      >
        <div className="start-term-output">
          {buf.map((elem, index) => (
            <p key={index}>{elem}</p>
          ))}
        </div>
      </div>
    </div>
  );
}
