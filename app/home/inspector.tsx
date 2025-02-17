import {
  Button,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
import { ChangeEvent, JSX, useCallback, useState } from 'react';

import { History } from '../../src/lang/ext/history.js';
import type {
  ListType,
  NamespaceType,
  RecordType,
} from '../../src/lang/types.js';

export default function Inspector({
  error,
  history,
  updateSlider,
}: {
  error: Error | null;
  history: History;
  updateSlider: (index: number) => void;
}) {
  const handleSliderChange = useCallback(
    (ev: ChangeEvent<HTMLInputElement>) => {
      updateSlider(Number(ev.target.value));
    },
    [updateSlider]
  );

  return (
    <Stack
      sx={{
        width: '100%',
        height: '100%',
        fontFamily: 'Roboto',
        fontSize: 14,
        marginTop: 1,
        overflow: 'auto',
      }}
    >
      <input
        type="range"
        min={0}
        max={history.length - 1}
        value={history.currentIndex}
        onChange={handleSliderChange}
        sx={{
          margin: 1,
          width: 'calc(100% - 20px)',
        }}
      />
      {error && <ErrorInspector error={error} />}
      {!history.isEmpty() && (
        <>
          <NamespaceInspector
            title="Global"
            namespace={history.current.globalNamespace}
          />
          <NamespaceInspector
            title="Local"
            namespace={history.current.topNamespace.head}
          />
        </>
      )}
    </Stack>
  );
}

function ErrorInspector({ error }: { error: Error }) {
  return (
    <Table
      sx={{
        marginBottom: '10px',
        width: '100%',
      }}
    >
      <TableHead>
        <TableRow>
          <TableCell
            colSpan={2}
            sx={{
              fontWeight: 'bold',
            }}
          >
            <Typography variant="h6">Error</Typography>
          </TableCell>
        </TableRow>
      </TableHead>
      <TableBody>
        <TableRow>
          <TableCell
            sx={{
              width: '25%',
              fontWeight: 'bold',
            }}
          >
            Message
          </TableCell>
          <TableCell
            sx={{
              width: '75%',
              color: '#aa0000',
            }}
          >
            {error.message}
          </TableCell>
        </TableRow>
      </TableBody>
    </Table>
  );
}

function NamespaceInspector({
  title,
  namespace,
}: {
  title: string;
  namespace: NamespaceType;
}) {
  return (
    <Table
      sx={{
        marginBottom: '10px',
        width: '100%',
      }}
    >
      <TableHead>
        <TableRow>
          <TableCell
            colSpan={2}
            sx={{
              fontWeight: 'bold',
            }}
          >
            <Typography variant="h6">{title}</Typography>
          </TableCell>
        </TableRow>
        <TableRow>
          <TableCell
            sx={{
              width: '25%',
              fontWeight: 'bold',
            }}
          >
            Variable
          </TableCell>
          <TableCell
            sx={{
              width: '75%',
              fontWeight: 'bold',
            }}
          >
            Value
          </TableCell>
        </TableRow>
      </TableHead>
      <TableBody>
        {Object.entries(namespace).map(([key, value]) => (
          <TableRow key={key}>
            <TableCell>{key}</TableCell>
            <TableCell>{inspectorFor(value)}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

function NoneInspector() {
  return <span>*none*</span>;
}

function BooleanInspector({ value }: { value: boolean }) {
  return <span>{value ? '*true*' : '*false*'}</span>;
}

function NumberInspector({ value }: { value: number }) {
  return (
    <span>
      {isFinite(value)
        ? Math.round((value + Number.EPSILON) * 1e6) / 1e6
        : value > 0
          ? '*infinity*'
          : '-*infinity'}
    </span>
  );
}

function StringInspector({ value }: { value: string }) {
  return <span>{value}</span>;
}

function ExpandableFooter({
  total,
  visible,
  setVisible,
}: {
  total: number;
  visible: number;
  setVisible: (visible: number) => void;
}) {
  return (
    <TableFooter>
      <TableRow
        sx={{
          '&:last-child td': {
            borderBottom: 0,
          },
        }}
      >
        <TableCell colSpan={2}>
          {visible > 5 && (
            <Button
              onClick={() => {
                setVisible(visible - 5);
              }}
            >
              Less
            </Button>
          )}
          {visible < total && (
            <Button
              onClick={() => {
                setVisible(visible + 5);
              }}
            >
              More
            </Button>
          )}
        </TableCell>
      </TableRow>
    </TableFooter>
  );
}

function ListInspector({ value }: { value: ListType }) {
  const [visible, setVisible] = useState(5);

  const rows: JSX.Element[] = [];
  for (let i = 0; i < Math.min(visible, value.length); i++) {
    rows.push(
      <TableRow key={i}>
        <TableCell>{inspectorFor(value[i])}</TableCell>
      </TableRow>
    );
  }

  return (
    <Table
      sx={{
        marginBottom: '10px',
        width: '100%',
      }}
    >
      <TableHead>
        <TableRow
          sx={{
            '&:last-child td': {
              borderBottom: 0,
            },
          }}
        >
          <TableCell
            sx={{
              width: '75%',
            }}
          >
            Items
          </TableCell>
        </TableRow>
      </TableHead>
      <TableBody>{rows}</TableBody>
      <ExpandableFooter
        total={value.length}
        visible={visible}
        setVisible={setVisible}
      />
    </Table>
  );
}

function RecordInspector({ value }: { value: RecordType }) {
  const [visible, setVisible] = useState(5);

  const keys = Object.keys(value);
  const rows: JSX.Element[] = [];
  for (let i = 0; i < Math.min(visible, keys.length); i++) {
    rows.push(
      <TableRow key={i}>
        <TableCell>{inspectorFor(keys[i])}</TableCell>
        <TableCell>{inspectorFor(value[keys[i]])}</TableCell>
      </TableRow>
    );
  }

  return (
    <Table
      sx={{
        marginBottom: '10px',
        width: '100%',
      }}
    >
      <TableHead>
        <TableRow
          sx={{
            '&:last-child td': {
              borderBottom: 0,
            },
          }}
        >
          <TableCell
            sx={{
              width: '25%',
            }}
          >
            Key
          </TableCell>
          <TableCell
            sx={{
              width: '75%',
            }}
          >
            Value
          </TableCell>
        </TableRow>
      </TableHead>
      <TableBody>{rows}</TableBody>
      <ExpandableFooter
        total={keys.length}
        visible={visible}
        setVisible={setVisible}
      />
    </Table>
  );
}

function inspectorFor(value: unknown) {
  if (value === null || value === undefined) {
    return <NoneInspector />;
  } else {
    switch (typeof value) {
      case 'boolean':
        return <BooleanInspector value={value} />;
      case 'number':
        return <NumberInspector value={value} />;
      case 'string':
        return <StringInspector value={value} />;
      case 'object':
        if (Array.isArray(value)) {
          return <ListInspector value={value} />;
        } else {
          return <RecordInspector value={value as RecordType} />;
        }
      default:
        throw new Error(`could not determine type for ${value}`);
    }
  }
}
