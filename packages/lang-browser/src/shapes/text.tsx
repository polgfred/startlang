import { Shape, ShapeProps } from './base.jsx';

export interface TextProps {
  ['font.name']: string;
  ['font.size']: number;
}

export class Text extends Shape {
  static alignTypes = Object.freeze([
    'start',
    'end',
    'left',
    'right',
    'center',
    'justify',
  ] as const);

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

    const { ['font.name']: fontName, ['font.size']: fontSize } = this.textProps;

    if (fontName) {
      svgProps.style.fontFamily = fontName;
    }
    if (fontSize) {
      svgProps.style.fontSize = fontSize;
    }

    return svgProps;
  }

  getSVGElement() {
    return (
      <text x={this.x} y={this.y} {...this.getSVGProps()}>
        {this.text}
      </text>
    );
  }
}
