import { Button, Stack, TextField } from '@mui/material';
import {
  ChangeEvent,
  KeyboardEvent,
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';

import { CellElement } from '../src/lang/ext/cells/index.js';

import { useInterpreter } from './interpreter-context.jsx';

interface InputState {
  prompt: string;
  initial: string;
  onInputComplete: (value: string) => void;
}

export default function Term({
  inputState,
}: {
  inputState: InputState | null;
}) {
  const {
    host: { outputBuffer },
  } = useInterpreter();

  const [input, setInput] = useState('');

  useEffect(() => {
    if (inputState) {
      setInput(inputState.initial);
    }
  }, [inputState]);

  const handleAccept = useCallback(() => {
    if (inputState) {
      inputState.onInputComplete(input);
      setInput('');
    }
  }, [input, inputState]);

  const handleChange = useCallback(
    (ev: ChangeEvent<HTMLInputElement>) => {
      setInput(ev.target.value);
    },
    [setInput]
  );

  const handleKeyUp = useCallback(
    (ev: KeyboardEvent<HTMLInputElement>) => {
      if (ev.key === 'Enter') {
        handleAccept();
      }
    },
    [handleAccept]
  );

  const scrollRef = useRef<HTMLDivElement | null>(null);
  useLayoutEffect(() => {
    scrollRef.current?.scrollIntoView({ block: 'end' });
  });

  return (
    <div
      sx={{
        height: '100%',
        overflow: 'auto',
      }}
    >
      {inputState && (
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
            label={inputState.prompt}
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
          fontSize: 14,
          padding: 2,
        }}
      >
        <CellElement cell={outputBuffer} />
      </div>
    </div>
  );
}
