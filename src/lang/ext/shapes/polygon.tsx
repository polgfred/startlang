import { Shape, ShapeProps } from './base.jsx';

export class Polygon extends Shape {
  constructor(
    public readonly points: [number, number][],
    shapeProps: ShapeProps
  ) {
    super(shapeProps);
  }

  getElement() {
    return (
      <polygon
        points={this.points.map(([x, y]) => `${x},${y}`).join(' ')}
        {...this.getAdditionalProps()}
      />
    );
  }
}
