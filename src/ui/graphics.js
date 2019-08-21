import React, { createElement } from 'react';

export default function Graphics({ data: { shapes } }) {
  return (
    <svg
      className="start-graphics"
      style={{
        height: 'calc(65vh - 80px)',
        width: '100%',
      }}
    >
      <g className="start-orient">
        <Group shapes={shapes} />
      </g>
    </svg>
  );
}

function Group({ shapes }) {
  return (
    <g>
      {shapes.map((elem, index) =>
        createElement(registry[elem.type], {
          key: index,
          shape: elem,
        })
      )}
    </g>
  );
}

function getStyles(sprops, tprops) {
  let attrs = { style: {} };
  let trans = '';

  if (sprops.stroke) {
    attrs.style.stroke = sprops.stroke;
  }
  if (sprops.fill) {
    attrs.style.fill = sprops.fill;
  }
  if (sprops.opacity && sprops.opacity < 1) {
    attrs.style.opacity = sprops.opacity;
  }
  if (sprops.rotate !== 0) {
    trans += `rotate(${sprops.rotate}deg)`;
  }
  if (sprops.scalex !== 1 || sprops.scaley !== 1) {
    trans += `scale(${sprops.scalex},${sprops.scaley})`;
  }
  if (trans) {
    attrs.style.transform = trans;
    attrs.style.transformOrigin = sprops.anchor;
  }
  if (tprops) {
    attrs.fontFamily = tprops.fface;
    attrs.fontSize = tprops.fsize;
  }

  return attrs;
}

function Rect({ shape: { sprops, x, y, width, height } }) {
  const styles = getStyles(sprops);
  return <rect {...styles} x={x} y={y} width={width} height={height} />;
}

function Circle({ shape: { sprops, cx, cy, r } }) {
  const styles = getStyles(sprops);
  return <circle {...styles} cx={cx} cy={cy} r={r} />;
}

function Ellipse({ shape: { sprops, cx, cy, rx, ry } }) {
  const styles = getStyles(sprops);
  return <ellipse {...styles} cx={cx} cy={cy} rx={rx} ry={ry} />;
}

function Line({ shape: { sprops, x1, y1, x2, y2 } }) {
  const styles = getStyles(sprops);
  return <line {...styles} x1={x1} y1={y1} x2={x2} y2={y2} />;
}

function Polygon({ shape: { sprops, points } }) {
  const styles = getStyles(sprops);
  return <polygon {...styles} points={points.join(',')} />;
}

function Text({ shape: { sprops, tprops, x, y, value } }) {
  const styles = getStyles(sprops, tprops);
  return (
    <text {...styles} x={x} y={y} textAnchor={tprops.align}>
      {value}
    </text>
  );
}

const registry = {
  rect: Rect,
  circle: Circle,
  ellipse: Ellipse,
  line: Line,
  polygon: Polygon,
  text: Text,
};
