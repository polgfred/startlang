import { Shape } from './base.jsx';

export class Circle extends Shape {
  constructor(
    public readonly cx: number,
    public readonly cy: number,
    public readonly r: number
  ) {
    super();
  }

  getElement() {
    return (
      <circle
        cx={this.cx}
        cy={this.cy}
        r={this.r}
        {...this.getAdditionalProps()}
      />
    );
  }
}
