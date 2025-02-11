import { produce } from 'immer';

import { Interpreter } from '../interpreter.js';

import {
  ShapeProps,
  TextProps,
  Shape,
  Text,
  Polygon,
  Line,
  Ellipse,
  Circle,
  Rect,
} from './shapes/index.js';

interface GraphicsProps {
  shapes: Shape[];
  shapeProps: ShapeProps;
  textProps: TextProps;
}

interface AppHost {
  clearDisplay(): void;
  setGraphicsData(next: (props: GraphicsProps) => GraphicsProps): void;
}

function waitForImmediate() {
  return new Promise((resolve) => {
    setTimeout(resolve, 0);
  });
}

type AppInterpreter = Interpreter<AppHost>;

function updateGraphicsProps(
  interpreter: AppInterpreter,
  shapePropsOverrides: Partial<ShapeProps> | null = null,
  textPropsOverrides: Partial<TextProps> | null = null
) {
  interpreter.host.setGraphicsData((graphicsProps) =>
    produce(graphicsProps, (draft) => {
      Object.assign(draft.shapeProps, shapePropsOverrides);
      Object.assign(draft.textProps, textPropsOverrides);
    })
  );
}

function addShape(interpreter: AppInterpreter, shape: Shape) {
  interpreter.host.setGraphicsData((graphicsProps) =>
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
  clear(interpreter: AppInterpreter) {
    interpreter.host.clearDisplay();
  },

  color(interpreter: AppInterpreter, [red, green, blue, alpha = 1]: number[]) {
    if (alpha === 1) {
      interpreter.setResult(`rgb(${red},${green},${blue})`);
    } else {
      interpreter.setResult(`rgba(${red},${green},${blue},${alpha})`);
    }
  },

  fill(interpreter: AppInterpreter, [color]: [string]) {
    updateGraphicsProps(interpreter, { fill: color });
  },

  stroke(interpreter: AppInterpreter, [color]: [string]) {
    updateGraphicsProps(interpreter, { stroke: color });
  },

  opacity(interpreter: AppInterpreter, [value]: [number]) {
    updateGraphicsProps(interpreter, { opacity: value });
  },

  anchor(interpreter: AppInterpreter, [anchor]: [string]) {
    updateGraphicsProps(interpreter, { anchor });
  },

  rotate(interpreter: AppInterpreter, [angle]: [number]) {
    updateGraphicsProps(interpreter, { rotate: angle });
  },

  scale(interpreter: AppInterpreter, [scalex, scaley = scalex]: number[]) {
    updateGraphicsProps(interpreter, { scalex, scaley });
  },

  fontFace(interpreter: AppInterpreter, [fontFace]: [string]) {
    updateGraphicsProps(interpreter, null, { fontFamily: fontFace });
  },

  fontSize(interpreter: AppInterpreter, [fontSize]: [number]) {
    updateGraphicsProps(interpreter, null, { fontSize });
  },

  textAlign(interpreter: AppInterpreter, [textAlign]: [string]) {
    updateGraphicsProps(interpreter, null, { textAlign });
  },

  rect(interpreter: AppInterpreter, [x, y, width, height]: number[]) {
    addShape(interpreter, new Rect(x, y, width, height));
    return waitForImmediate();
  },

  circle(interpreter: AppInterpreter, [cx, cy, radius]: number[]) {
    addShape(interpreter, new Circle(cx, cy, radius));
    return waitForImmediate();
  },

  ellipse(interpreter: AppInterpreter, [cx, cy, rx, ry]: number[]) {
    addShape(interpreter, new Ellipse(cx, cy, rx, ry));
    return waitForImmediate();
  },

  line(interpreter: AppInterpreter, [x1, y1, x2, y2]: number[]) {
    addShape(interpreter, new Line(x1, y1, x2, y2));
    return waitForImmediate();
  },

  polygon(interpreter: AppInterpreter, [points]: [[number, number][]]) {
    addShape(interpreter, new Polygon(points));
    return waitForImmediate();
  },

  text(interpreter: AppInterpreter, [x, y, text]: [number, number, string]) {
    addShape(interpreter, new Text(x, y, text));
    return waitForImmediate();
  },
};
