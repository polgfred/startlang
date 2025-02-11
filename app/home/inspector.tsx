'use client';

import {
  Button,
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
import { useState } from 'react';

function NamespaceInspector({ title, ns }) {
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
        {Object.entries(ns).map(([key, value]) => (
          <TableRow key={key}>
            <TableCell>{key}</TableCell>
            <TableCell>{inspectorFor(value)}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

export default function Inspector({ hist, snap, updateSlider }) {
  const current = hist[snap] || hist[hist.length - 1];

  return (
    <div
      sx={{
        width: '100%',
        height: '100%',
      }}
    >
      <input
        type="range"
        min={0}
        max={hist.length - 1}
        value={snap}
        onChange={updateSlider}
        sx={{
          margin: 1,
          width: 'calc(100% - 20px)',
        }}
      />
      <div
        sx={{
          fontFamily: 'Roboto',
          fontSize: 14,
          height: 'calc(100% - 40px)',
          marginTop: 1,
          overflow: 'auto',
        }}
      >
        {current && (
          <>
            <NamespaceInspector title="Global" ns={current.gns} />
            <NamespaceInspector title="Local" ns={current.lns.head} />
          </>
        )}
      </div>
    </div>
  );
}

function NoneInspector() {
  return <span>*none*</span>;
}

function BooleanInspector({ value }) {
  return <span>{value ? '*true*' : '*false*'}</span>;
}

function NumberInspector({ value }) {
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

function StringInspector({ value }) {
  return <span>{value}</span>;
}

function TimeInspector({ value }) {
  return <span>{value.toLocaleString()}</span>;
}

function ExpandableFooter({ onShowLess, onShowMore }) {
  return (
    <TableFooter>
      <TableRow key="trunc">
        <TableCell colSpan="2">
          <Button onClick={onShowLess}>Less</Button>
          <Button onClick={onShowMore}>More</Button>
        </TableCell>
      </TableRow>
    </TableFooter>
  );
}

function ListInspector({ value }) {
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

function TableInspector({ value }) {
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

function inspectorFor(value) {
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
        if (value.constructor === Date) {
          return <TimeInspector value={value} />;
        } else if (Array.isArray(value)) {
          return <ListInspector value={value} />;
        } else {
          return <TableInspector value={value} />;
        }
      default:
        throw new Error(`could not determine type for ${value}`);
    }
  }
}
