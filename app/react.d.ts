/* eslint-disable @typescript-eslint/no-empty-object-type */

import React from 'react';

interface SxProps {
  sx?:
    | React.CSSProperties
    | ((theme) => React.CSSProperties)
    | ReadonlyArray<React.CSSProperties | ((theme) => React.CSSProperties)>;
}

// Add the sx prop to all HTML and SVG elements:
// https://github.com/mui/pigment-css/blob/master/README.md#typescript-1

declare global {
  namespace React {
    interface HTMLAttributes<T> extends SxProps {}
    interface SVGProps<T> extends SxProps {}
  }
}
