import { Stack } from '@mui/material';
import { produce } from 'immer';
import { Fragment } from 'react';

import { Cell } from './base.jsx';

export class StackCell extends Cell {
  readonly direction: 'row' | 'column';

  constructor(
    direction: string,
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
      <Stack direction={this.direction}>
        {this.children.map((child, i) => (
          <Fragment key={i}>{child.getHTMLElement()}</Fragment>
        ))}
      </Stack>
    );
  }
}
