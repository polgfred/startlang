'use client';

export default function Graphics({ shapes }) {
  return (
    <svg
      sx={{
        height: '100%',
        width: '100%',
      }}
    >
      <g>
        {shapes.map((shape, index) => {
          const { sprops, tprops } = shape;
          const styles = { style: {} };
          let trans = '';

          if (sprops.stroke) {
            styles.style.stroke = sprops.stroke;
          }
          if (sprops.fill) {
            styles.style.fill = sprops.fill;
          }
          if (sprops.opacity >= 0 && sprops.opacity < 1) {
            styles.style.opacity = sprops.opacity;
          }
          if (sprops.rotate !== 0) {
            trans += `rotate(${sprops.rotate}deg)`;
          }
          if (sprops.scalex !== 1 || sprops.scaley !== 1) {
            trans += `scale(${sprops.scalex},${sprops.scaley})`;
          }
          if (trans) {
            styles.style.transform = trans;
            styles.style.transformOrigin = sprops.anchor;
          }
          if (tprops) {
            styles.fontFamily = tprops.fface;
            styles.fontSize = tprops.fsize;
          }

          switch (shape.type) {
            case 'rect': {
              const { x, y, width, height } = shape;
              return (
                <rect
                  key={index}
                  x={x}
                  y={y}
                  width={width}
                  height={height}
                  {...styles}
                />
              );
            }
            case 'circle': {
              const { cx, cy, r } = shape;
              return <circle key={index} cx={cx} cy={cy} r={r} {...styles} />;
            }
            case 'ellipse': {
              const { cx, cy, rx, ry } = shape;
              return (
                <ellipse
                  key={index}
                  cx={cx}
                  cy={cy}
                  rx={rx}
                  ry={ry}
                  {...styles}
                />
              );
            }
            case 'line': {
              const { x1, y1, x2, y2 } = shape;
              return (
                <line key={index} x1={x1} y1={y1} x2={x2} y2={y2} {...styles} />
              );
            }
            case 'polygon': {
              const { points } = shape;
              return (
                <polygon key={index} points={points.join(',')} {...styles} />
              );
            }
            case 'text': {
              const { x, y, value } = shape;
              return (
                <text
                  key={index}
                  x={x}
                  y={y}
                  textAnchor={tprops.align}
                  {...styles}
                >
                  {value}
                </text>
              );
            }
          }
        })}
      </g>
    </svg>
  );
}
