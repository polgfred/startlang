import { Shape } from './base.jsx';

export class Polygon extends Shape {
  constructor(public readonly points: [number, number][]) {
    super();
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
