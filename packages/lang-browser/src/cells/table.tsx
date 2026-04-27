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

type AlignType = (typeof GridSlotCell.alignTypes)[number];
type VAlignType = (typeof GridSlotCell.valignTypes)[number];

export interface GridSlotProps {
  align: AlignType;
  valign: VAlignType;
  width: number | string | null;
  span: number;
  rowspan: number;
  ['background.color']: string | null;
}

export const initialGridSlotProps: GridSlotProps = Object.freeze({
  align: 'inherit',
  valign: 'inherit',
  width: null,
  span: 1,
  rowspan: 1,
  ['background.color']: null,
});

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

export class GridSlotCell extends Cell {
  static alignTypes = Object.freeze([
    'inherit',
    'left',
    'center',
    'right',
    'justify',
  ] as const);

  static valignTypes = Object.freeze([
    'inherit',
    'top',
    'middle',
    'bottom',
    'baseline',
  ] as const);

  readonly children: readonly Cell[] = Object.freeze([]);

  constructor(readonly slotProps: GridSlotProps = initialGridSlotProps) {
    super();
  }

  addChild(child: Cell): Cell {
    return produce(this, (draft) => {
      draft.children.push(child);
    });
  }

  static mergeProps(props: GridSlotProps, overrides: Record<string, unknown>) {
    return produce(props, (draft) => {
      for (const [name, value] of Object.entries(overrides)) {
        GridSlotCell.assignProp(draft, name, value);
      }
    });
  }

  private static assignProp(
    props: GridSlotProps,
    name: string,
    value: unknown
  ) {
    switch (name) {
      case 'align': {
        if (!GridSlotCell.alignTypes.includes(value as AlignType)) {
          throw new Error(`invalid value for align: ${value}`);
        }
        props.align = value as AlignType;
        break;
      }
      case 'valign': {
        if (!GridSlotCell.valignTypes.includes(value as VAlignType)) {
          throw new Error(`invalid value for valign: ${value}`);
        }
        props.valign = value as VAlignType;
        break;
      }
      case 'width': {
        if (
          value !== null &&
          typeof value !== 'number' &&
          typeof value !== 'string'
        ) {
          throw new Error(`invalid value for width: ${value}`);
        }
        props.width = value;
        break;
      }
      case 'span': {
        if (typeof value !== 'number' || !Number.isInteger(value) || value < 1) {
          throw new Error(`invalid value for span: ${value}`);
        }
        props.span = value;
        break;
      }
      case 'rowspan': {
        if (typeof value !== 'number' || !Number.isInteger(value) || value < 1) {
          throw new Error(`invalid value for rowspan: ${value}`);
        }
        props.rowspan = value;
        break;
      }
      case 'background.color': {
        if (value !== null && typeof value !== 'string') {
          throw new Error(`invalid value for background.color: ${value}`);
        }
        props['background.color'] = value;
        break;
      }
      default: {
        throw new Error(`invalid prop: ${name}`);
      }
    }
  }

  getTableCellElement(header: boolean, key?: number) {
    return (
      <TableCell
        key={key}
        component={header ? 'th' : 'td'}
        align={this.slotProps.align}
        colSpan={this.slotProps.span}
        rowSpan={this.slotProps.rowspan}
        sx={(theme) => ({
          verticalAlign: this.slotProps.valign,
          width: this.slotProps.width ?? undefined,
          backgroundColor: this.slotProps['background.color'] ?? undefined,
          ...(header ? { color: theme.palette.common.white } : null),
        })}
      >
        {this.children.map((child, i) => (
          <CellElement key={i} cell={child} />
        ))}
      </TableCell>
    );
  }

  getHTMLElement() {
    return this.getTableCellElement(false);
  }
}

export class GridRowCell extends Cell {
  constructor(readonly children: readonly GridSlotCell[] = emptyArray) {
    super();
  }

  addChild(child: Cell): Cell {
    if (!(child instanceof GridSlotCell)) {
      throw new Error('table rows can only contain cells');
    }

    return produce(this, (draft) => {
      draft.children.push(castDraft(child));
    });
  }

  getHTMLElement() {
    return (
      <TableRow
        sx={{
          '&:last-child td': {
            borderBottom: 0,
          },
        }}
      >
        {this.children.map((child, i) => child.getTableCellElement(false, i))}
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
          '&:last-child th': {
            borderBottom: 0,
          },
        })}
      >
        {this.children.map((child, i) => child.getTableCellElement(true, i))}
      </TableRow>
    );
  }
}
