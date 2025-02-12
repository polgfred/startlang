import { memo } from 'react';

import { Shape } from '../../src/lang/ext/shapes/index.js';

const ShapeElement = memo(function ShapeElement({ shape }: { shape: Shape }) {
  return shape.getSVGElement();
});

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
          <ShapeElement key={index} shape={shape} />
        ))}
      </g>
    </svg>
  );
}
