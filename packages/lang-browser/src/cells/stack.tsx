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

export const initialStackProps: StackProps = Object.freeze({
  direction: 'column',
  align: 'normal',
  justify: 'normal',
});

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

  constructor(readonly stackProps: StackProps = initialStackProps) {
    super();
  }

  addChild(child: Cell) {
    return produce(this, (draft) => {
      draft.children.push(child);
    });
  }

  static updateProps(props: StackProps, name: string, value: unknown) {
    return produce(props, (draft) => {
      StackCell.assignProp(draft, name, value);
    });
  }

  static mergeProps(props: StackProps, overrides: Record<string, unknown>) {
    return produce(props, (draft) => {
      for (const [name, value] of Object.entries(overrides)) {
        StackCell.assignProp(draft, name, value);
      }
    });
  }

  private static assignProp(props: StackProps, name: string, value: unknown) {
    switch (name) {
      case 'direction': {
        if (!StackCell.directionTypes.includes(value as DirectionType)) {
          throw new Error(`invalid value for direction: ${value}`);
        }
        props.direction = value as DirectionType;
        break;
      }

      case 'align': {
        if (!StackCell.alignTypes.includes(value as AlignType)) {
          throw new Error(`invalid value for align: ${value}`);
        }
        props.align = value as AlignType;
        break;
      }
      case 'justify': {
        if (!StackCell.justifyTypes.includes(value as JustifyType)) {
          throw new Error(`invalid value for justify: ${value}`);
        }
        props.justify = value as JustifyType;
        break;
      }
      default: {
        throw new Error(`invalid prop: ${name}`);
      }
    }
  }

  getHTMLElement() {
    return (
      <Stack
        spacing={2}
        direction={this.stackProps.direction}
        divider={
          <Divider
            flexItem
            orientation={
              this.stackProps.direction === 'column' ? 'horizontal' : 'vertical'
            }
          />
        }
        sx={{
          alignItems: this.stackProps.align,
          justifyContent: this.stackProps.justify,
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
