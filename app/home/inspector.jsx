'use client';

import {
  Button,
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableRow,
} from '@mui/material';
import { useState } from 'react';

export default function Inspector({ hist, snap, updateSlider }) {
  const current = hist[snap] || hist[hist.length - 1];

  return (
    <div
      sx={{
        fontFamily: 'Roboto',
        fontSize: 14,
        height: 'calc(100vh - 120px)',
      }}
    >
      <div
        sx={{
          marginBottom: '20px',
        }}
      >
        <input
          type="range"
          min={0}
          max={hist.length - 1}
          value={snap}
          onChange={updateSlider}
          sx={{
            margin: '0 10px',
            width: 'calc(100% - 20px)',
          }}
        />
      </div>
      <div
        sx={{
          height: 'calc(100vh - 160px)',
          overflow: 'scroll',
        }}
      >
        <Table
          sx={{
            width: '100%',
          }}
        >
          <TableHead>
            <TableRow>
              <TableCell
                sx={{
                  fontWeight: 'bold',
                  width: '25%',
                }}
              >
                Variable
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
          {current && (
            <TableBody>
              {Object.entries(current.gns).map(([key, value]) => (
                <TableRow key={key}>
                  <TableCell>{key}</TableCell>
                  <TableCell>{inspectorFor(value)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          )}
        </Table>
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
      {isFinite(value) ? value : value > 0 ? '*infinity*' : '-*infinity'}
    </span>
  );
}

function StringInspector({ value }) {
  return <span>{value}</span>;
}

function TimeInspector({ value }) {
  return <span>{value.toLocaleString()}</span>;
}

function ExpandableFooter({ onShowMore }) {
  return (
    <TableFooter>
      <TableRow key="trunc">
        <TableCell colSpan="2" className="start-vars-expando-more">
          <Button color="secondary" onClick={onShowMore}>
            More
          </Button>
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
      {value.size > visible && (
        <ExpandableFooter onShowMore={() => setVisible(visible + 5)} />
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
        {Object.entries()
          .slice(0, visible)
          .map(([key, value]) => (
            <TableRow key={key}>
              <TableCell>{inspectorFor(key)}</TableCell>
              <TableCell>{inspectorFor(value)}</TableCell>
            </TableRow>
          ))}
      </TableBody>
      {value.size > visible && (
        <ExpandableFooter onShowMore={() => setVisible(visible + 5)} />
      )}
    </Table>
  );
}

export const inspectorKey = Symbol('START_INSPECTOR');

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
        if (value[inspectorKey]) {
          return value[inspectorKey](value);
        } else if (value.constructor === Date) {
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
