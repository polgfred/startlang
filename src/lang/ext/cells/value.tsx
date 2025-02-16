import { Typography } from '@mui/material';

import { Cell } from './base.jsx';

const variantMap = Object.freeze({
  heading1: 'h1',
  heading2: 'h2',
  heading3: 'h3',
  heading4: 'h4',
  heading5: 'h5',
  heading6: 'h6',
  subtitle1: 'subtitle1',
  subtitle2: 'subtitle2',
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
