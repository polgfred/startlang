'use client';

function Shape({ shape }) {
  const {
    sprops: { rotate, scalex, scaley, anchor, stroke, fill, opacity },
    tprops: { fface, fsize, align },
  } = shape;
  const style = {};
  const transforms = [];

  if (rotate !== 0) {
    transforms.push(`rotate(${rotate})`);
  }
  if (scalex !== 1 || scaley !== 1) {
    transforms.push(`scale(${scalex} ${scaley})`);
  }
  if (anchor) {
    style.transformOrigin = anchor;
    style.transformBox = 'fill-box';
  }
  if (stroke) {
    style.stroke = stroke;
  }
  if (fill) {
    style.fill = fill;
  }
  if (opacity >= 0 && opacity < 1) {
    style.opacity = opacity;
  }
  if (fface) {
    style.fontFamily = fface;
  }
  if (fsize) {
    style.fontSize = fsize;
  }

  const transform = transforms.join(' ');

  switch (shape.type) {
    case 'rect': {
      const { x, y, width, height } = shape;
      return (
        <rect
          x={x}
          y={y}
          width={width}
          height={height}
          transform={transform}
          style={style}
        />
      );
    }
    case 'circle': {
      const { cx, cy, r } = shape;
      return (
        <circle cx={cx} cy={cy} r={r} transform={transform} style={style} />
      );
    }
    case 'ellipse': {
      const { cx, cy, rx, ry } = shape;
      return (
        <ellipse
          cx={cx}
          cy={cy}
          rx={rx}
          ry={ry}
          transform={transform}
          style={style}
        />
      );
    }
    case 'line': {
      const { x1, y1, x2, y2 } = shape;
      return (
        <line
          x1={x1}
          y1={y1}
          x2={x2}
          y2={y2}
          transform={transform}
          style={style}
        />
      );
    }
    case 'polygon': {
      const { points } = shape;
      return (
        <polygon
          points={points.join(',')}
          transform={transform}
          style={style}
        />
      );
    }
    case 'text': {
      const { x, y, value } = shape;
      return (
        <text
          x={x}
          y={y}
          textAnchor={align}
          transform={transform}
          style={style}
        >
          {value}
        </text>
      );
    }
  }
}

export default function Graphics({ shapes }) {
  return (
    <svg
      sx={{
        height: '100%',
        width: '100%',
      }}
    >
      <g>
        {shapes.map((shape, index) => (
          <Shape key={index} shape={shape} />
        ))}
      </g>
    </svg>
  );
}
