import { Shape, ShapeProps } from './base.jsx';

export class Circle extends Shape {
  constructor(
    public readonly cx: number,
    public readonly cy: number,
    public readonly r: number,
    shapeProps: ShapeProps
  ) {
    super(shapeProps);
  }

  getSVGElement() {
    return (
      <circle cx={this.cx} cy={this.cy} r={this.r} {...this.getSVGProps()} />
    );
  }
}
