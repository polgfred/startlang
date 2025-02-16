import { Divider, Stack } from '@mui/material';
import { produce } from 'immer';

import { Cell, CellElement } from './base.jsx';

const justifyContentMap = Object.freeze({
  start: 'flex-start',
  center: 'center',
  end: 'flex-end',
  stretch: 'stretch',
  around: 'space-around',
  between: 'space-between',
  evenly: 'space-evenly',
});

export class StackCell extends Cell {
  readonly direction: 'row' | 'column';
  readonly justify: keyof typeof justifyContentMap;

  constructor(
    direction: string,
    justify: string = 'start',
    readonly children: readonly Cell[] = Object.freeze([])
  ) {
    if (direction !== 'row' && direction !== 'column') {
      throw new Error(`invalid direction: ${direction}`);
    }
    if (!(justify in justifyContentMap)) {
      throw new Error(`invalid justify: ${justify}`);
    }
    super();
    this.direction = direction;
    // @ts-expect-error we just checked it
    this.justify = justify;
  }

  addChild(child: Cell) {
    return produce(this, (draft) => {
      draft.children.push(child);
    });
  }

  getHTMLElement() {
    return (
      <Stack
        gap={2}
        direction={this.direction}
        justifyContent={justifyContentMap[this.justify]}
        divider={
          <Divider
            flexItem
            orientation={
              this.direction === 'column' ? 'horizontal' : 'vertical'
            }
          />
        }
        sx={{
          width: '100%',
          height: '100%',
        }}
      >
        {this.children.map((child, i) => (
          <CellElement key={i} cell={child} />
        ))}
      </Stack>
    );
  }
}
