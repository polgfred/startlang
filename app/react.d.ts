/* eslint-disable @typescript-eslint/no-empty-object-type */

import type { Theme, SxProps } from '@mui/material/styles';
import React from 'react';

interface WithSxProps {
  sx?: SxProps<Theme>;
}

// Add the sx prop to all HTML and SVG elements:
// https://github.com/mui/pigment-css/blob/master/README.md#typescript-1

declare global {
  namespace React {
    interface HTMLAttributes<T> extends WithSxProps {}
    interface SVGProps<T> extends WithSxProps {}
  }
}
