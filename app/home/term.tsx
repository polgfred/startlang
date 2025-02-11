'use client';

import { Button, Stack, TextField } from '@mui/material';
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
        overflow: 'auto',
      }}
    >
      {prompt && (
        <Stack
          direction="row"
          sx={{
            alignItems: 'center',
            justifyContent: 'stretch',
            width: '100%',
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
            sx={{
              flexGrow: 1,
            }}
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
        </Stack>
      )}
      <div
        ref={scrollRef}
        sx={{
          fontFamily: 'Roboto',
          fontSize: '14px',
        }}
      >
        {buf.map((elem, index) => (
          <p key={index}>{elem}</p>
        ))}
      </div>
    </div>
  );
}
