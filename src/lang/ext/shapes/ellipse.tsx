import { Shape, ShapeProps } from './base.jsx';

export class Ellipse extends Shape {
  constructor(
    public readonly cx: number,
    public readonly cy: number,
    public readonly rx: number,
    public readonly ry: number,
    shapeProps: ShapeProps
  ) {
    super(shapeProps);
  }

  getElement() {
    return (
      <ellipse
        cx={this.cx}
        cy={this.cy}
        rx={this.rx}
        ry={this.ry}
        {...this.getAdditionalProps()}
      />
    );
  }
}
