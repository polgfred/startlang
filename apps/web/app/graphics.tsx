import { Shape } from '@startlang/lang-browser/shapes';
import { memo } from 'react';

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
      {shapes.map((shape, index) => (
        <ShapeElement key={index} shape={shape} />
      ))}
    </svg>
  );
}
