import { Typography } from '@mui/material';

import { Cell } from './base.jsx';

const variantMap = Object.freeze({
  h1: 'h1',
  h2: 'h2',
  h3: 'h3',
  h4: 'h4',
  h5: 'h5',
  h6: 'h6',
  body1: 'body1',
  body2: 'body2',
});

export class ValueCell extends Cell {
  readonly variant: keyof typeof variantMap;

  constructor(
    readonly value: string,
    variant: string = 'body1'
  ) {
    if (!(variant in variantMap)) {
      throw new Error(`invalid variant: ${variant}`);
    }
    super();
    // @ts-expect-error we just checked it
    this.variant = variant;
  }

  getHTMLElement() {
    return (
      <Typography variant={variantMap[this.variant]}>{this.value}</Typography>
    );
  }
}
