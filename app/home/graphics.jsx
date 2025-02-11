import { Fragment } from 'react';

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
          <Fragment key={index}>{shape.getElement()}</Fragment>
        ))}
      </g>
    </svg>
  );
}
