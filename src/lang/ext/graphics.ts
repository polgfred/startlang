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

export type HistoryItem = Pick<
  Interpreter,
  | 'globalFunctions'
  | 'globalNamespace'
  | 'topFrame'
  | 'topNamespace'
  | 'lastResult'
> &
  Pick<AppHost, 'shapes' | 'shapeProps' | 'textProps'>;

export class AppHost {
  constructor(private readonly forceRender: () => void) {}

  shapes: readonly Shape[] = [];

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

  pushShape(shape: Shape) {
    this.shapes = produce(this.shapes, (draft) => {
      draft.push(shape);
    });
    this.forceRender();
  }

  history: HistoryItem[] = [];
  historyIndex: number = 0;

  clearHistory() {
    this.history = [];
    this.historyIndex = 0;
  }

  pushHistory(historyItem: HistoryItem) {
    this.history.push(historyItem);
    this.historyIndex = this.history.length - 1;
  }

  moveToHistoryIndex(index: number) {
    this.historyIndex = index;

    const historyItem = this.history[index];
    this.shapes = historyItem.shapes;
    this.shapeProps = historyItem.shapeProps;
    this.textProps = historyItem.textProps;
    return historyItem;
  }
}

function waitForImmediate() {
  return new Promise((resolve) => {
    setTimeout(resolve, 0);
  });
}

function getHost(interpreter: Interpreter) {
  if (!(interpreter.host instanceof AppHost)) {
    throw new Error('invalid host for interpreter');
  }
  return interpreter.host;
}

export const graphicsGlobals = {
  snapshot(interpreter: Interpreter) {
    const host = getHost(interpreter);
    host.pushHistory({
      ...interpreter.takeSnapshot(),
      shapes: host.shapes,
      shapeProps: host.shapeProps,
      textProps: host.textProps,
    });
  },

  clear(interpreter: Interpreter) {
    const host = getHost(interpreter);
    host.clearDisplay();
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
    host.pushShape(new Rect(x, y, width, height, host.shapeProps));
    return waitForImmediate();
  },

  circle(interpreter: Interpreter, [cx, cy, radius]: number[]) {
    const host = getHost(interpreter);
    host.pushShape(new Circle(cx, cy, radius, host.shapeProps));
    return waitForImmediate();
  },

  ellipse(interpreter: Interpreter, [cx, cy, rx, ry]: number[]) {
    const host = getHost(interpreter);
    host.pushShape(new Ellipse(cx, cy, rx, ry, host.shapeProps));
    return waitForImmediate();
  },

  line(interpreter: Interpreter, [x1, y1, x2, y2]: number[]) {
    const host = getHost(interpreter);
    host.pushShape(new Line(x1, y1, x2, y2, host.shapeProps));
    return waitForImmediate();
  },

  polygon(interpreter: Interpreter, [points]: [[number, number][]]) {
    const host = getHost(interpreter);
    host.pushShape(new Polygon(points, host.shapeProps));
    return waitForImmediate();
  },

  text(interpreter: Interpreter, [x, y, text]: [number, number, string]) {
    const host = getHost(interpreter);
    host.pushShape(new Text(x, y, text, host.textProps, host.shapeProps));
    return waitForImmediate();
  },
};
