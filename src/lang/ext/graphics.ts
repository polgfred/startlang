import { produce } from 'immer';

import { Interpreter } from '../interpreter.js';

import {
  ShapeProps,
  TextProps,
  shapeProps,
  textProps,
  Shape,
  Text,
  Polygon,
  Line,
  Ellipse,
  Circle,
  Rect,
} from './shapes/index.js';

interface GraphicsProps {
  shapes: readonly Shape[];
  shapeProps: ShapeProps;
  textProps: TextProps;
}

export const graphicsProps: GraphicsProps = Object.freeze({
  shapes: Object.freeze([]),
  shapeProps,
  textProps,
});

interface AppHost {
  clearDisplay(): void;
  setGraphicsData(next: (props: GraphicsProps) => GraphicsProps): void;
}

function waitForImmediate() {
  return new Promise((resolve) => {
    setTimeout(resolve, 0);
  });
}

function updateGraphicsProps(
  interpreter: Interpreter,
  shapePropsOverrides: Partial<ShapeProps> | null = null,
  textPropsOverrides: Partial<TextProps> | null = null
) {
  (interpreter.host as AppHost).setGraphicsData((graphicsProps) =>
    produce(graphicsProps, (draft) => {
      Object.assign(draft.shapeProps, shapePropsOverrides);
      Object.assign(draft.textProps, textPropsOverrides);
    })
  );
}

function addShape(interpreter: Interpreter, shape: Shape) {
  (interpreter.host as AppHost).setGraphicsData((graphicsProps) =>
    produce(graphicsProps, (draft) => {
      draft.shapes.push(
        produce(shape, (draft2) => {
          draft2.shapeProps = graphicsProps.shapeProps;
          draft2.textProps = graphicsProps.textProps;
        })
      );
    })
  );
}

export const graphicsGlobals = {
  clear(interpreter: Interpreter) {
    (interpreter.host as AppHost).clearDisplay();
  },

  color(interpreter: Interpreter, [red, green, blue, alpha = 1]: number[]) {
    const r = `${Number((red * 100).toFixed(6))}%`;
    const g = `${Number((green * 100).toFixed(6))}%`;
    const b = `${Number((blue * 100).toFixed(6))}%`;
    const a = `${Number((alpha * 100).toFixed(6))}%`;

    if (alpha === 1) {
      interpreter.setResult(`rgb(${r} ${g} ${b})`);
    } else {
      interpreter.setResult(`rgb(${r} ${g} ${b} / ${a})`);
    }
  },

  fill(interpreter: Interpreter, [color]: [string]) {
    updateGraphicsProps(interpreter, { fill: color });
  },

  stroke(interpreter: Interpreter, [color]: [string]) {
    updateGraphicsProps(interpreter, { stroke: color });
  },

  opacity(interpreter: Interpreter, [value]: [number]) {
    updateGraphicsProps(interpreter, { opacity: value });
  },

  anchor(interpreter: Interpreter, [anchor]: [string]) {
    updateGraphicsProps(interpreter, { anchor });
  },

  rotate(interpreter: Interpreter, [angle]: [number]) {
    updateGraphicsProps(interpreter, { rotate: angle });
  },

  scale(interpreter: Interpreter, [scalex, scaley = scalex]: number[]) {
    updateGraphicsProps(interpreter, { scalex, scaley });
  },

  font(interpreter: Interpreter, [fontFamily, fontSize]: [string, number]) {
    updateGraphicsProps(interpreter, null, { fontFamily, fontSize });
  },

  align(interpreter: Interpreter, [textAlign]: [string]) {
    updateGraphicsProps(interpreter, null, { textAlign });
  },

  rect(interpreter: Interpreter, [x, y, width, height]: number[]) {
    addShape(interpreter, new Rect(x, y, width, height));
    return waitForImmediate();
  },

  circle(interpreter: Interpreter, [cx, cy, radius]: number[]) {
    addShape(interpreter, new Circle(cx, cy, radius));
    return waitForImmediate();
  },

  ellipse(interpreter: Interpreter, [cx, cy, rx, ry]: number[]) {
    addShape(interpreter, new Ellipse(cx, cy, rx, ry));
    return waitForImmediate();
  },

  line(interpreter: Interpreter, [x1, y1, x2, y2]: number[]) {
    addShape(interpreter, new Line(x1, y1, x2, y2));
    return waitForImmediate();
  },

  polygon(interpreter: Interpreter, [points]: [[number, number][]]) {
    addShape(interpreter, new Polygon(points));
    return waitForImmediate();
  },

  text(interpreter: Interpreter, [x, y, text]: [number, number, string]) {
    addShape(interpreter, new Text(x, y, text));
    return waitForImmediate();
  },
};
