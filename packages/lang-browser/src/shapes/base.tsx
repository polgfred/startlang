import { immerable } from 'immer';
import { JSX, CSSProperties } from 'react';

export interface ShapeProps {
  opacity: number;
  anchor: string;
  rotate: number;
  ['fill.color']: string | null;
  ['stroke.color']: string | null;
  ['stroke.width']: number;
  ['scale.x']: number;
  ['scale.y']: number;
}

export abstract class Shape {
  static [immerable] = true;

  constructor(public readonly shapeProps: ShapeProps) {}

  abstract getSVGElement(): JSX.Element;

  protected getSVGProps() {
    const {
      opacity,
      anchor,
      rotate,
      ['fill.color']: fill,
      ['stroke.color']: stroke,
      ['stroke.width']: strokeWidth,
      ['scale.x']: scalex,
      ['scale.y']: scaley,
    } = this.shapeProps;

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
    if (strokeWidth) {
      svgProps.style.strokeWidth = strokeWidth;
    }
    if (opacity !== null && opacity >= 0 && opacity < 1) {
      svgProps.style.opacity = opacity;
    }

    return svgProps;
  }
}
