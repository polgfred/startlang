import { Fragment } from 'react';

import { Shape } from '../../src/lang/ext/shapes/index.js';

export default function Graphics({ shapes }: { shapes: readonly Shape[] }) {
  return (
    <svg
      sx={{
        height: '100%',
        width: '100%',
      }}
    >
      <g>
        {shapes.map((shape, index) => (
          <Fragment key={index}>{shape.getSVGElement()}</Fragment>
        ))}
      </g>
    </svg>
  );
}
