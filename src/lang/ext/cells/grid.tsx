import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
} from '@mui/material';
import { castDraft, produce } from 'immer';

import { Cell, CellElement } from './base.jsx';

const emptyArray = Object.freeze([]);

export class GridCell extends Cell {
  constructor(
    readonly headers: readonly GridRowCell[] = emptyArray,
    readonly rows: readonly GridRowCell[] = emptyArray
  ) {
    super();
  }

  addChild(child: Cell) {
    if (!(child instanceof GridRowCell)) {
      throw new Error('invalid operation');
    }

    return produce(this, (draft) => {
      if (child instanceof GridHeaderRowCell) {
        draft.headers.push(castDraft(child));
      } else {
        draft.rows.push(castDraft(child));
      }
    });
  }

  getHTMLElement() {
    return (
      <Table
        sx={{
          width: '100%',
        }}
      >
        <TableHead>
          {this.headers.map((child, i) => (
            <CellElement key={i} cell={child} />
          ))}
        </TableHead>
        <TableBody>
          {this.rows.map((child, i) => (
            <CellElement key={i} cell={child} />
          ))}
        </TableBody>
      </Table>
    );
  }
}

export class GridRowCell extends Cell {
  constructor(readonly children: readonly Cell[] = emptyArray) {
    super();
  }

  addChild(child: Cell): Cell {
    return produce(this, (draft) => {
      draft.children.push(child);
    });
  }

  getHTMLElement() {
    return (
      <TableRow>
        {this.children.map((child, i) => (
          <TableCell key={i}>
            <CellElement key={i} cell={child} />
          </TableCell>
        ))}
      </TableRow>
    );
  }
}

export class GridHeaderRowCell extends GridRowCell {
  getHTMLElement() {
    return (
      <TableRow
        sx={(theme) => ({
          backgroundColor: theme.palette.grey[800],
        })}
      >
        {this.children.map((child, i) => (
          <TableCell
            key={i}
            sx={(theme) => ({
              color: theme.palette.common.white,
            })}
          >
            <CellElement key={i} cell={child} />
          </TableCell>
        ))}
      </TableRow>
    );
  }
}
