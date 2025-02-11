import { Shape } from './base.js';

export class Ellipse extends Shape {
  constructor(
    public readonly cx: number,
    public readonly cy: number,
    public readonly rx: number,
    public readonly ry: number
  ) {
    super();
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
