import { immerable } from 'immer';
import { JSX, CSSProperties } from 'react';

export interface ShapeProps {
  fill: string | null;
  stroke: string | null;
  opacity: number;
  anchor: string;
  rotate: number;
  scalex: number;
  scaley: number;
}

export interface TextProps {
  ['font.name']: string;
  ['font.size']: number;
}

export abstract class Shape {
  static [immerable] = true;

  constructor(public readonly shapeProps: ShapeProps) {}

  abstract getSVGElement(): JSX.Element;

  protected getSVGProps() {
    const { rotate, scalex, scaley, anchor, fill, stroke, opacity } =
      this.shapeProps;

    const svgProps: { style: CSSProperties; transform: string } = {
      style: {},
      transform: '',
    };

    if (rotate !== 0) {
      svgProps.transform += `rotate(${rotate})`;
    }
    if (scalex !== 1 || scaley !== 1) {
      svgProps.transform += `scale(${scalex} ${scaley})`;
    }
    if (anchor) {
      svgProps.style.transformOrigin = anchor;
      svgProps.style.transformBox = 'fill-box';
    }
    if (fill) {
      svgProps.style.fill = fill;
    }
    if (stroke) {
      svgProps.style.stroke = stroke;
    }
    if (opacity !== null && opacity >= 0 && opacity < 1) {
      svgProps.style.opacity = opacity;
    }

    return svgProps;
  }
}
