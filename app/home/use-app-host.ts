import { produce } from 'immer';
import { useCallback, useMemo, useRef, useState } from 'react';

import { AppHost } from '../../src/lang/ext/graphics.js';
import {
  Shape,
  ShapeProps,
  TextProps,
} from '../../src/lang/ext/shapes/index.js';

export function useAppHost(): AppHost {
  // const [, setRenderCount] = useState(0);
  // const forceRerender = useCallback(() => {
  //   setRenderCount((count) => count + 1);
  // }, []);

  const shapeProps = useRef<ShapeProps>({
    fill: null,
    stroke: null,
    opacity: 1,
    anchor: 'center',
    rotate: 0,
    scalex: 1,
    scaley: 1,
  });

  const updateShapeProps = useCallback((newProps: Partial<ShapeProps>) => {
    shapeProps.current = produce(shapeProps.current, (draft) => {
      Object.assign(draft, newProps);
    });
  }, []);

  const textProps = useRef<TextProps>({
    fontFamily: 'Helvetica',
    fontSize: 36,
    textAlign: 'start',
  });

  const updateTextProps = useCallback((newProps: Partial<TextProps>) => {
    textProps.current = produce(textProps.current, (draft) => {
      Object.assign(draft, newProps);
    });
  }, []);

  const shapes = useRef<readonly Shape[]>([]);

  const addShape = useCallback((shape: Shape) => {
    shapes.current = produce(shapes.current, (draft) => {
      draft.push(shape);
    });
  }, []);

  return useMemo(
    () => ({
      get shapeProps() {
        return shapeProps.current;
      },
      get textProps() {
        return textProps.current;
      },
      get shapes() {
        return shapes.current;
      },
      clearDisplay() {
        shapes.current = [];
      },
      updateShapeProps,
      updateTextProps,
      addShape,
    }),
    []
  );
}
