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
import { ChangeEvent, useCallback, useState } from 'react';

import { History } from '../../src/lang/ext/history.js';
import type {
  ListType,
  NamespaceType,
  TableType,
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
  onShowLess,
  onShowMore,
}: {
  onShowLess: () => void;
  onShowMore: () => void;
}) {
  return (
    <TableFooter>
      <TableRow key="trunc">
        <TableCell colSpan={2}>
          <Button onClick={onShowLess}>Less</Button>
          <Button onClick={onShowMore}>More</Button>
        </TableCell>
      </TableRow>
    </TableFooter>
  );
}

function ListInspector({ value }: { value: ListType }) {
  const [visible, setVisible] = useState(5);

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
            sx={{
              width: '75%',
            }}
          >
            Items
          </TableCell>
        </TableRow>
      </TableHead>
      <TableBody>
        {value.slice(0, visible).map((item, index) => (
          <TableRow key={index}>
            <TableCell>{inspectorFor(item)}</TableCell>
          </TableRow>
        ))}
      </TableBody>
      {value.length > visible && (
        <ExpandableFooter
          onShowLess={() => setVisible(visible - 5)}
          onShowMore={() => setVisible(visible + 5)}
        />
      )}
    </Table>
  );
}

function TableInspector({ value }: { value: TableType }) {
  const [visible, setVisible] = useState(5);

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
      <TableBody>
        {Object.entries(value)
          .slice(0, visible)
          .map(([key, value]) => (
            <TableRow key={key}>
              <TableCell>{inspectorFor(key)}</TableCell>
              <TableCell>{inspectorFor(value)}</TableCell>
            </TableRow>
          ))}
      </TableBody>
      {Object.keys(value).length > visible && (
        <ExpandableFooter
          onShowLess={() => setVisible(visible - 5)}
          onShowMore={() => setVisible(visible + 5)}
        />
      )}
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
          return <TableInspector value={value as TableType} />;
        }
      default:
        throw new Error(`could not determine type for ${value}`);
    }
  }
}
