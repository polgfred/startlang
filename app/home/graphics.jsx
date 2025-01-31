'use client';

function Shape({ shape }) {
  const {
    sprops: { rotate, scalex, scaley, anchor, stroke, fill, opacity },
    tprops: { fface, fsize, align },
  } = shape;
  const styles = {
    style: {},
  };
  const transforms = [];

  if (rotate !== 0) {
    transforms.push(`rotate(${rotate})`);
  }
  if (scalex !== 1 || scaley !== 1) {
    transforms.push(`scale(${scalex} ${scaley})`);
  }
  if (anchor) {
    styles.style.transformOrigin = anchor;
    styles.style.transformBox = 'fill-box';
  }
  if (stroke) {
    styles.style.stroke = stroke;
  }
  if (fill) {
    styles.style.fill = fill;
  }
  if (opacity >= 0 && opacity < 1) {
    styles.style.opacity = opacity;
  }
  if (fface) {
    styles.fontFamily = fface;
  }
  if (fsize) {
    styles.fontSize = fsize;
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
          {...styles}
        />
      );
    }
    case 'circle': {
      const { cx, cy, r } = shape;
      return <circle cx={cx} cy={cy} r={r} transform={transform} {...styles} />;
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
          {...styles}
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
          {...styles}
        />
      );
    }
    case 'polygon': {
      const { points } = shape;
      return (
        <polygon points={points.join(',')} transform={transform} {...styles} />
      );
    }
    case 'text': {
      const { x, y, value } = shape;
      return (
        <text x={x} y={y} textAnchor={align} transform={transform} {...styles}>
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
