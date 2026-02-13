import { memo } from 'react';

import { ShapeSnapshot } from '../src/desktop/types.js';

const ShapeElement = memo(function ShapeElement({
  shape,
}: {
  shape: ShapeSnapshot;
}) {
  const sharedProps = {
    style: shape.style,
    transform: shape.transform,
  };

  switch (shape.kind) {
    case 'circle':
      return <circle cx={shape.cx} cy={shape.cy} r={shape.r} {...sharedProps} />;
    case 'ellipse':
      return (
        <ellipse cx={shape.cx} cy={shape.cy} rx={shape.rx} ry={shape.ry} {...sharedProps} />
      );
    case 'line':
      return (
        <line
          x1={shape.x1}
          y1={shape.y1}
          x2={shape.x2}
          y2={shape.y2}
          {...sharedProps}
        />
      );
    case 'polygon':
      return (
        <polygon
          points={shape.points.map(([x, y]) => `${x},${y}`).join(' ')}
          {...sharedProps}
        />
      );
    case 'rect':
      return (
        <rect
          x={shape.x}
          y={shape.y}
          width={shape.width}
          height={shape.height}
          {...sharedProps}
        />
      );
    case 'text':
      return (
        <text x={shape.x} y={shape.y} {...sharedProps}>
          {shape.text}
        </text>
      );
    default:
      return null;
  }
});

export default function Graphics({
  shapes,
}: {
  shapes: readonly ShapeSnapshot[];
}) {
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
