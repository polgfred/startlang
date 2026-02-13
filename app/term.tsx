import {
  Button,
  Divider,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material';
import {
  ChangeEvent,
  KeyboardEvent,
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';

import { CellSnapshot } from '../src/desktop/types.js';

export interface InputState {
  prompt: string;
  initial: string;
  onInputComplete: (value: string) => void;
}

export default function Term({
  outputBuffer,
  inputState,
}: {
  outputBuffer: CellSnapshot | null;
  inputState: InputState | null;
}) {
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
        {outputBuffer && <CellSnapshotElement cell={outputBuffer} />}
      </div>
    </div>
  );
}

function CellSnapshotElement({ cell }: { cell: CellSnapshot }) {
  switch (cell.kind) {
    case 'value':
      return <Typography variant={cell.variant}>{cell.value}</Typography>;
    case 'stack':
      return (
        <Stack
          gap={2}
          direction={cell.direction}
          alignItems={cell.align}
          justifyContent={cell.justify}
          divider={
            <Divider
              flexItem
              orientation={cell.direction === 'column' ? 'horizontal' : 'vertical'}
            />
          }
          sx={{
            width: '100%',
          }}
        >
          {cell.children.map((child, index) => (
            <CellSnapshotElement key={index} cell={child} />
          ))}
        </Stack>
      );
    case 'grid':
      return (
        <Table
          sx={{
            width: '100%',
          }}
        >
          <TableHead>
            {cell.headers.map((row, index) => (
              <CellSnapshotElement key={`head-${index}`} cell={row} />
            ))}
          </TableHead>
          <TableBody>
            {cell.rows.map((row, index) => (
              <CellSnapshotElement key={`row-${index}`} cell={row} />
            ))}
          </TableBody>
        </Table>
      );
    case 'row':
      return (
        <TableRow
          sx={{
            '&:last-child td, &:last-child th': {
              borderBottom: 0,
            },
          }}
        >
          {cell.cells.map((entry, index) => {
            if (cell.isHeader) {
              return (
                <TableCell
                  key={index}
                  sx={(theme) => ({
                    color: theme.palette.common.white,
                    backgroundColor: theme.palette.grey[800],
                  })}
                >
                  <CellSnapshotElement cell={entry} />
                </TableCell>
              );
            }
            return (
              <TableCell key={index}>
                <CellSnapshotElement cell={entry} />
              </TableCell>
            );
          })}
        </TableRow>
      );
    default:
      return null;
  }
}
