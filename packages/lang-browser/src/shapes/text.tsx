import { Shape, ShapeProps } from './base.jsx';

export interface TextProps {
  ['font.name']: string | null;
  ['font.size']: number | string | null;
  ['font.weight']: string | number | null;
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

    const {
      ['font.name']: fontName,
      ['font.size']: fontSize,
      ['font.weight']: fontWeight,
    } = this.textProps;

    if (fontName !== null) {
      svgProps.style.fontFamily = fontName;
    }
    if (fontSize !== null) {
      svgProps.style.fontSize = fontSize;
    }
    if (fontWeight !== null) {
      svgProps.style.fontWeight = fontWeight;
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
