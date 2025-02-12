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

export interface AppHost {
  shapes: readonly Shape[];
  shapeProps: ShapeProps;
  textProps: TextProps;
  clearDisplay(): void;
  updateShapeProps(props: Partial<ShapeProps>): void;
  updateTextProps(props: Partial<TextProps>): void;
  addShape(shape: Shape): void;
}

function waitForImmediate() {
  return new Promise((resolve) => {
    setTimeout(resolve, 0);
  });
}

function getHost(interpreter: Interpreter) {
  return interpreter.host as AppHost;
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

  fill(interpreter: Interpreter, [color]: [string | null]) {
    const host = getHost(interpreter);
    host.updateShapeProps({ fill: color });
  },

  stroke(interpreter: Interpreter, [color]: [string | null]) {
    const host = getHost(interpreter);
    host.updateShapeProps({ stroke: color });
  },

  opacity(interpreter: Interpreter, [value]: [number]) {
    const host = getHost(interpreter);
    host.updateShapeProps({ opacity: value });
  },

  anchor(interpreter: Interpreter, [anchor]: [string]) {
    const host = getHost(interpreter);
    host.updateShapeProps({ anchor });
  },

  rotate(interpreter: Interpreter, [angle]: [number]) {
    const host = getHost(interpreter);
    host.updateShapeProps({ rotate: angle });
  },

  scale(interpreter: Interpreter, [scalex, scaley = scalex]: number[]) {
    const host = getHost(interpreter);
    host.updateShapeProps({ scalex, scaley });
  },

  font(interpreter: Interpreter, [fontFamily, fontSize]: [string, number]) {
    const host = getHost(interpreter);
    host.updateTextProps({ fontFamily, fontSize });
  },

  align(interpreter: Interpreter, [textAlign]: [string]) {
    const host = getHost(interpreter);
    host.updateTextProps({ textAlign });
  },

  rect(interpreter: Interpreter, [x, y, width, height]: number[]) {
    const host = getHost(interpreter);
    host.addShape(new Rect(x, y, width, height, host.shapeProps));
    return waitForImmediate();
  },

  circle(interpreter: Interpreter, [cx, cy, radius]: number[]) {
    const host = getHost(interpreter);
    host.addShape(new Circle(cx, cy, radius, host.shapeProps));
    return waitForImmediate();
  },

  ellipse(interpreter: Interpreter, [cx, cy, rx, ry]: number[]) {
    const host = getHost(interpreter);
    host.addShape(new Ellipse(cx, cy, rx, ry, host.shapeProps));
    return waitForImmediate();
  },

  line(interpreter: Interpreter, [x1, y1, x2, y2]: number[]) {
    const host = getHost(interpreter);
    host.addShape(new Line(x1, y1, x2, y2, host.shapeProps));
    return waitForImmediate();
  },

  polygon(interpreter: Interpreter, [points]: [[number, number][]]) {
    const host = getHost(interpreter);
    host.addShape(new Polygon(points, host.shapeProps));
    return waitForImmediate();
  },

  text(interpreter: Interpreter, [x, y, text]: [number, number, string]) {
    const host = getHost(interpreter);
    host.addShape(new Text(x, y, text, host.textProps, host.shapeProps));
    return waitForImmediate();
  },
};
