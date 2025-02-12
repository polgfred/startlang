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
  fontFamily: string;
  fontSize: number;
  textAlign: string;
}

export abstract class Shape {
  static [immerable] = true;

  constructor(public readonly shapeProps: ShapeProps) {}

  abstract getElement(): JSX.Element;

  protected getAdditionalProps() {
    const { rotate, scalex, scaley, anchor, fill, stroke, opacity } =
      this.shapeProps;

    const additionalProps: { style: CSSProperties; transform: string } = {
      style: {},
      transform: '',
    };

    if (rotate !== 0) {
      additionalProps.transform += `rotate(${rotate})`;
    }
    if (scalex !== 1 || scaley !== 1) {
      additionalProps.transform += `scale(${scalex} ${scaley})`;
    }
    if (anchor) {
      additionalProps.style.transformOrigin = anchor;
      additionalProps.style.transformBox = 'fill-box';
    }
    if (fill) {
      additionalProps.style.fill = fill;
    }
    if (stroke) {
      additionalProps.style.stroke = stroke;
    }
    if (opacity !== null && opacity >= 0 && opacity < 1) {
      additionalProps.style.opacity = opacity;
    }

    return additionalProps;
  }
}
