import { produce } from 'immer';

import { Interpreter } from '../interpreter.js';
import { CallFrame, CallNode } from '../nodes/index.js';
import type { RuntimeFunctions } from '../types.js';
import { Cons } from '../utils/cons.js';

import {
  Cell,
  GridCell,
  GridHeaderRowCell,
  GridRowCell,
  StackCell,
  ValueCell,
  rootCell,
} from './cells/index.js';
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
  outputBuffer: StackCell;
  currentCell: Cons<Cell>;
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
    this.currentCell = new Cons(rootCell);
  }

  pushCell(cell: Cell) {
    this.currentCell = this.currentCell.push(cell);
  }

  popCell() {
    const cell = this.currentCell.head;
    this.currentCell = this.currentCell.pop();
    return cell;
  }

  addCell(cell: Cell) {
    if (this.currentCell.head === rootCell) {
      this.outputBuffer = this.outputBuffer.addChild(cell);
      this.forceRender();
      return waitForRepaint();
    } else {
      this.currentCell = this.currentCell.swap(
        this.currentCell.head.addChild(cell)
      );
    }
  }

  takeSnapshot(): BrowserSnapshot {
    return {
      shapes: this.shapes,
      shapeProps: this.shapeProps,
      textProps: this.textProps,
      outputBuffer: this.outputBuffer,
      currentCell: this.currentCell,
    };
  }

  restoreSnapshot(snapshot: BrowserSnapshot) {
    this.shapes = snapshot.shapes;
    this.shapeProps = snapshot.shapeProps;
    this.textProps = snapshot.textProps;
    this.outputBuffer = snapshot.outputBuffer;
    this.currentCell = snapshot.currentCell;
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

class BuildCellFrame extends CallFrame {
  constructor(
    node: CallNode,
    readonly cell: Cell
  ) {
    super(node);
  }

  visit(interpreter: Interpreter) {
    const host = getHost(interpreter);
    const { body } = this.node;

    switch (this.state) {
      case 0: {
        if (body) {
          host.pushCell(this.cell);
          interpreter.swapFrame(this, 1);
          interpreter.pushFrame(body);
        } else {
          interpreter.popFrame();
        }
        break;
      }
      case 1: {
        interpreter.swapFrame(this, 2);
        return host.addCell(host.popCell());
      }
      case 2: {
        interpreter.popFrame();
        break;
      }
    }
  }
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

  heading(interpreter, [value, level = 1]: [unknown, number]) {
    const host = getHost(interpreter);
    const handler = interpreter.getHandler(value);
    return host.addCell(
      new ValueCell(handler.getPrettyValue(value), `h${level}`)
    );
  },

  print(interpreter, [value]: [unknown]) {
    const host = getHost(interpreter);
    const handler = interpreter.getHandler(value);
    return host.addCell(new ValueCell(handler.getPrettyValue(value)));
  },

  vstack(interpreter, [justify]: [string], node) {
    return new BuildCellFrame(node, new StackCell('column', justify));
  },

  hstack(interpreter, [justify]: [string], node) {
    return new BuildCellFrame(node, new StackCell('row', justify));
  },

  grid(interpreter, args, node) {
    return new BuildCellFrame(node, new GridCell());
  },

  header(interpreter, args, node) {
    return new BuildCellFrame(node, new GridHeaderRowCell());
  },

  row(interpreter, args, node) {
    return new BuildCellFrame(node, new GridRowCell());
  },
};
