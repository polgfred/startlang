import { produce } from 'immer';

import { Interpreter } from '../interpreter.js';
import type { RuntimeFunctions } from '../types.js';
import { Cons } from '../utils/cons.js';

import { Cell, StackCell, ValueCell, rootCell } from './cells/index.js';
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

export interface BrowserSnapshot {
  shapes: readonly Shape[];
  shapeProps: ShapeProps;
  textProps: TextProps;
}

const emptyArray = Object.freeze([]);

export class BrowserHost {
  constructor(private readonly forceRender: () => void) {}

  shapes: readonly Shape[] = emptyArray;

  shapeProps: ShapeProps = Object.freeze({
    fill: null,
    stroke: null,
    opacity: 1,
    anchor: 'center',
    rotate: 0,
    scalex: 1,
    scaley: 1,
  });

  textProps: TextProps = Object.freeze({
    fontFamily: 'Helvetica',
    fontSize: 36,
    textAlign: 'start',
  });

  clearDisplay() {
    this.shapes = emptyArray;
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

  outputBuffer = new StackCell('column');
  currentCell: Cons<Cell> = new Cons(rootCell);

  clearOutputBuffer() {
    this.outputBuffer = new StackCell('column');
  }

  pushCell(cell: Cell) {
    this.currentCell = this.currentCell.push(cell);
  }

  addCell(cell: Cell) {
    if (this.currentCell.head === rootCell) {
      this.outputBuffer = this.outputBuffer.addChild(cell);
    } else {
      this.currentCell = this.currentCell.swap(
        this.currentCell.head.addChild(cell)
      );
    }
  }

  popCell() {
    const cell = this.currentCell.head;
    this.currentCell = this.currentCell.pop();
    if (this.currentCell.head === rootCell) {
      this.outputBuffer = this.outputBuffer.addChild(cell);
      this.forceRender();
    } else {
      this.addCell(cell);
    }
  }

  takeSnapshot(): BrowserSnapshot {
    return {
      shapes: this.shapes,
      shapeProps: this.shapeProps,
      textProps: this.textProps,
    };
  }

  restoreSnapshot(snapshot: BrowserSnapshot) {
    this.shapes = snapshot.shapes;
    this.shapeProps = snapshot.shapeProps;
    this.textProps = snapshot.textProps;
  }
}

function waitForRepaint() {
  return new Promise<void>((resolve) => {
    setTimeout(resolve, 0);
  });
}

function getHost(interpreter: Interpreter) {
  if (!(interpreter.host instanceof BrowserHost)) {
    throw new Error('invalid host for interpreter');
  }
  return interpreter.host;
}

export const browserGlobals: RuntimeFunctions = {
  clear(interpreter) {
    const host = getHost(interpreter);
    host.clearDisplay();
  },

  color(interpreter, [red, green, blue, alpha = 1]: number[]) {
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

  fill(interpreter, [color]: [string | null]) {
    const host = getHost(interpreter);
    host.updateShapeProps({ fill: color });
  },

  stroke(interpreter, [color]: [string | null]) {
    const host = getHost(interpreter);
    host.updateShapeProps({ stroke: color });
  },

  opacity(interpreter, [value]: [number]) {
    const host = getHost(interpreter);
    host.updateShapeProps({ opacity: value });
  },

  anchor(interpreter, [anchor]: [string]) {
    const host = getHost(interpreter);
    host.updateShapeProps({ anchor });
  },

  rotate(interpreter, [angle]: [number]) {
    const host = getHost(interpreter);
    host.updateShapeProps({ rotate: angle });
  },

  scale(interpreter, [scalex, scaley = scalex]: number[]) {
    const host = getHost(interpreter);
    host.updateShapeProps({ scalex, scaley });
  },

  font(interpreter, [fontFamily, fontSize]: [string, number]) {
    const host = getHost(interpreter);
    host.updateTextProps({ fontFamily, fontSize });
  },

  align(interpreter, [textAlign]: [string]) {
    const host = getHost(interpreter);
    host.updateTextProps({ textAlign });
  },

  rect(interpreter, [x, y, width, height]: number[]) {
    const host = getHost(interpreter);
    host.pushShape(new Rect(x, y, width, height, host.shapeProps));
    return waitForRepaint();
  },

  circle(interpreter, [cx, cy, radius]: number[]) {
    const host = getHost(interpreter);
    host.pushShape(new Circle(cx, cy, radius, host.shapeProps));
    return waitForRepaint();
  },

  ellipse(interpreter, [cx, cy, rx, ry]: number[]) {
    const host = getHost(interpreter);
    host.pushShape(new Ellipse(cx, cy, rx, ry, host.shapeProps));
    return waitForRepaint();
  },

  line(interpreter, [x1, y1, x2, y2]: number[]) {
    const host = getHost(interpreter);
    host.pushShape(new Line(x1, y1, x2, y2, host.shapeProps));
    return waitForRepaint();
  },

  polygon(interpreter, [points]: [[number, number][]]) {
    const host = getHost(interpreter);
    host.pushShape(new Polygon(points, host.shapeProps));
    return waitForRepaint();
  },

  text(interpreter, [x, y, text]: [number, number, string]) {
    const host = getHost(interpreter);
    host.pushShape(new Text(x, y, text, host.textProps, host.shapeProps));
    return waitForRepaint();
  },

  print(interpreter, [value]: [unknown]) {
    const host = getHost(interpreter);
    const handler = interpreter.getHandler(value);
    host.addCell(new ValueCell(handler.getPrettyValue(value)));
    if (host.currentCell.head === rootCell) {
      return waitForRepaint();
    }
  },

  column(interpreter, [justify]: [string], finalize) {
    const host = getHost(interpreter);
    if (!finalize) {
      host.pushCell(new StackCell('column', justify));
    } else {
      host.popCell();
    }
    if (host.currentCell.head === rootCell) {
      return waitForRepaint();
    }
  },

  row(interpreter, [justify]: [string], finalize) {
    const host = getHost(interpreter);
    if (!finalize) {
      host.pushCell(new StackCell('row', justify));
    } else {
      host.popCell();
    }
    if (host.currentCell.head === rootCell) {
      return waitForRepaint();
    }
  },
};
