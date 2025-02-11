import { immerable } from 'immer';
import { JSX, CSSProperties } from 'react';

export interface ShapeProps {
  stroke: string | null;
  fill: string | null;
  opacity: number | null;
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

export const shapeProps: ShapeProps = Object.freeze({
  stroke: null,
  fill: null,
  opacity: null,
  anchor: 'center',
  rotate: 0,
  scalex: 1,
  scaley: 1,
});

export const textProps: TextProps = Object.freeze({
  fontFamily: 'Helvetica',
  fontSize: 36,
  textAlign: 'start',
});

export abstract class Shape {
  readonly shapeProps: ShapeProps = shapeProps;
  readonly textProps: TextProps = textProps;

  abstract getElement(): JSX.Element;

  protected getAdditionalProps() {
    const { rotate, scalex, scaley, anchor, stroke, fill, opacity } =
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
    if (stroke) {
      additionalProps.style.stroke = stroke;
    }
    if (fill) {
      additionalProps.style.fill = fill;
    }
    if (opacity >= 0 && opacity < 1) {
      additionalProps.style.opacity = opacity;
    }

    return additionalProps;
  }
}

Shape[immerable] = true;
