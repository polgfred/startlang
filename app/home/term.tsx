import { Button, Stack, TextField } from '@mui/material';
import {
  ChangeEvent,
  KeyboardEvent,
  useCallback,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';

interface InputState {
  prompt: string;
  onInputComplete: (value: string) => void;
}

export default function Term({
  textBuffer,
  inputState,
}: {
  textBuffer: readonly string[];
  inputState: InputState | null;
}) {
  const [input, setInput] = useState('');

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
          fontSize: '14px',
        }}
      >
        {textBuffer.map((line, index) => (
          <p
            key={index}
            sx={{
              padding: 1,
              borderBottom: '1px solid #dddddd',
            }}
          >
            {line}
          </p>
        ))}
      </div>
    </div>
  );
}
