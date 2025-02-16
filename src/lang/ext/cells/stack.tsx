import { Divider, Stack } from '@mui/material';
import { produce } from 'immer';

import { Cell, CellElement } from './base.jsx';

export class StackCell extends Cell {
  constructor(
    readonly direction: 'row' | 'column',
    readonly children: Cell[] = []
  ) {
    if (direction !== 'row' && direction !== 'column') {
      throw new Error(`invalid direction: ${direction}`);
    }
    super();
    this.direction = direction;
  }

  addChild(child: Cell) {
    return produce(this, (draft) => {
      draft.children.push(child);
    });
  }

  getHTMLElement() {
    return (
      <Stack
        direction={this.direction}
        gap={2}
        divider={
          <Divider
            flexItem
            orientation={
              this.direction === 'column' ? 'horizontal' : 'vertical'
            }
          />
        }
      >
        {this.children.map((child, i) => (
          <CellElement key={i} cell={child} />
        ))}
      </Stack>
    );
  }
}
