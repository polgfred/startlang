import { Divider, Stack } from '@mui/material';
import { produce } from 'immer';

import { Cell, CellElement } from './base.jsx';

type DirectionType = (typeof StackCell.directionTypes)[number];

type AlignType = (typeof StackCell.alignTypes)[number];

type JustifyType = (typeof StackCell.justifyTypes)[number];

export interface StackProps {
  direction: DirectionType;
  align: AlignType;
  justify: JustifyType;
}

export class StackCell extends Cell {
  static directionTypes = Object.freeze(['row', 'column'] as const);

  static alignTypes = Object.freeze([
    'normal',
    'stretch',
    'center',
    'start',
    'end',
    'flex-start',
    'flex-end',
    'self-start',
    'self-end',
    'anchor-center',
  ] as const);

  static justifyTypes = Object.freeze([
    'normal',
    'center',
    'start',
    'end',
    'flex-start',
    'flex-end',
    'left',
    'right',
    'space-between',
    'space-around',
    'space-evenly',
    'stretch',
  ] as const);

  readonly children: readonly Cell[] = Object.freeze([]);
  readonly stackProps: StackProps = Object.freeze({
    direction: 'column',
    align: 'normal',
    justify: 'normal',
  });

  addChild(child: Cell) {
    return produce(this, (draft) => {
      draft.children.push(child);
    });
  }

  updateProp(name: string, value: unknown) {
    return produce(this, (draft) => {
      switch (name) {
        case 'direction': {
          if (!StackCell.directionTypes.includes(value as DirectionType)) {
            throw new Error(`invalid value for direction: ${value}`);
          }
          // @ts-expect-error we just checked it
          draft.stackProps.direction = value;
          break;
        }

        case 'align': {
          if (!StackCell.alignTypes.includes(value as AlignType)) {
            throw new Error(`invalid value for align: ${value}`);
          }
          // @ts-expect-error we just checked it
          draft.stackProps.align = value;
          break;
        }
        case 'justify': {
          if (!StackCell.justifyTypes.includes(value as JustifyType)) {
            throw new Error(`invalid value for justify: ${value}`);
          }
          // @ts-expect-error we just checked it
          draft.stackProps.justify = value;
          break;
        }
        default: {
          throw new Error(`invalid prop: ${name}`);
        }
      }
    });
  }

  getHTMLElement() {
    return (
      <Stack
        gap={2}
        direction={this.stackProps.direction}
        alignItems={this.stackProps.align}
        justifyContent={this.stackProps.justify}
        divider={
          <Divider
            flexItem
            orientation={
              this.stackProps.direction === 'column' ? 'horizontal' : 'vertical'
            }
          />
        }
        sx={{
          width: '100%',
        }}
      >
        {this.children.map((child, i) => (
          <CellElement key={i} cell={child} />
        ))}
      </Stack>
    );
  }
}
