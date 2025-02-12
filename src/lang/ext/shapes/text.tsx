import { Shape, ShapeProps, TextProps } from './base.jsx';

export class Text extends Shape {
  constructor(
    public readonly x: number,
    public readonly y: number,
    public readonly text: string,
    public readonly textProps: TextProps,
    shapeProps: ShapeProps
  ) {
    super(shapeProps);
  }

  protected getSVGProps() {
    const svgProps = super.getSVGProps();

    const { fontFamily, fontSize } = this.textProps;

    if (fontFamily) {
      svgProps.style.fontFamily = fontFamily;
    }
    if (fontSize) {
      svgProps.style.fontSize = fontSize;
    }

    return svgProps;
  }

  getElement() {
    return (
      <text x={this.x} y={this.y} {...this.getSVGProps()}>
        {this.text}
      </text>
    );
  }
}
