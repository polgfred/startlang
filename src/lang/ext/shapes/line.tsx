import { Shape } from './base.jsx';

export class Line extends Shape {
  constructor(
    public readonly x1: number,
    public readonly y1: number,
    public readonly x2: number,
    public readonly y2: number
  ) {
    super();
  }

  getElement() {
    return (
      <line
        x1={this.x1}
        y1={this.y1}
        x2={this.x2}
        y2={this.y2}
        {...this.getAdditionalProps()}
      />
    );
  }
}
