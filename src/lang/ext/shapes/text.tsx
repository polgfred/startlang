import { Shape } from './base.jsx';

export class Text extends Shape {
  constructor(
    public readonly x: number,
    public readonly y: number,
    public readonly text: string
  ) {
    super();
  }

  protected getAdditionalProps() {
    const additionalProps = super.getAdditionalProps();

    const { fontFamily, fontSize } = this.textProps;

    if (fontFamily) {
      additionalProps.style.fontFamily = fontFamily;
    }
    if (fontSize) {
      additionalProps.style.fontSize = fontSize;
    }

    return additionalProps;
  }

  getElement() {
    return (
      <text x={this.x} y={this.y} {...this.getAdditionalProps()}>
        {this.text}
      </text>
    );
  }
}
