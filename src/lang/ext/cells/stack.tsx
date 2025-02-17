import { Divider, Stack } from '@mui/material';
import { produce } from 'immer';

import { Cell, CellElement } from './base.jsx';

type DirectionType = (typeof directionTypes)[number];

const directionTypes = Object.freeze(['row', 'column'] as const);

type AlignType = (typeof alignTypes)[number];

const alignTypes = Object.freeze([
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

type JustifyType = (typeof justifyTypes)[number];

const justifyTypes = Object.freeze([
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

export interface StackProps {
  direction: DirectionType;
  align: AlignType;
  justify: JustifyType;
}

export class StackCell extends Cell {
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

  updateProps(props: UncheckedProps<StackProps>) {
    return produce(this, (draft) => {
      if (
        props.direction &&
        !directionTypes.includes(props.direction as DirectionType)
      ) {
        throw new Error(`invalid value for direction: ${props.direction}`);
      }
      if (props.align && !alignTypes.includes(props.align as AlignType)) {
        throw new Error(`invalid value for align: ${props.align}`);
      }
      if (
        props.justify &&
        !justifyTypes.includes(props.justify as JustifyType)
      ) {
        throw new Error(`invalid value for justify: ${props.justify}`);
      }
      Object.assign(draft.stackProps, props);
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
