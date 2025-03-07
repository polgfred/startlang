import { Shape, ShapeProps } from './base.jsx';

export class Rect extends Shape {
  constructor(
    public readonly x: number,
    public readonly y: number,
    public readonly width: number,
    public readonly height: number,
    shapeProps: ShapeProps
  ) {
    super(shapeProps);
  }

  getSVGElement() {
    return (
      <rect
        x={this.x}
        y={this.y}
        width={this.width}
        height={this.height}
        {...this.getSVGProps()}
      />
    );
  }
}
