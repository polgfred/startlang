import { produce } from 'immer';
import { useCallback, useMemo, useRef } from 'react';

import { AppHost } from '../../src/lang/ext/graphics.js';
import {
  Shape,
  ShapeProps,
  TextProps,
} from '../../src/lang/ext/shapes/index.js';

class AppHostImpl implements AppHost {
  constructor(private readonly forceRender: () => void) {}

  public shapes: readonly Shape[] = [];

  shapeProps: ShapeProps = {
    fill: null,
    stroke: null,
    opacity: 1,
    anchor: 'center',
    rotate: 0,
    scalex: 1,
    scaley: 1,
  };

  textProps: TextProps = {
    fontFamily: 'Helvetica',
    fontSize: 36,
    textAlign: 'start',
  };

  clearDisplay() {
    this.shapes = [];
    this.forceRender();
  }

  resetShapes(shapes: readonly Shape[]) {
    this.shapes = shapes;
    this.forceRender();
  }

  updateShapeProps(newProps: Partial<ShapeProps>) {
    this.shapeProps = produce(this.shapeProps, (draft) => {
      Object.assign(draft, newProps);
    });
  }

  updateTextProps(newProps: Partial<TextProps>) {
    this.textProps = produce(this.textProps, (draft) => {
      Object.assign(draft, newProps);
    });
  }

  addShape(shape: Shape) {
    this.shapes = produce(this.shapes, (draft) => {
      draft.push(shape);
    });
    this.forceRender();
  }
}

export function useAppHost(forceRender: () => void) {
  return useRef(new AppHostImpl(forceRender));
}
