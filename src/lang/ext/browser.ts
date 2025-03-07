import { EventEmitter } from 'events';

import { produce } from 'immer';

import { Interpreter, type SupportsSnapshots } from '../interpreter.js';
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

const initialShapeProps: ShapeProps = Object.freeze({
  opacity: 1,
  anchor: 'center',
  rotate: 0,
  ['fill.color']: null,
  ['stroke.color']: null,
  ['stroke.width']: 1,
  ['scale.x']: 1,
  ['scale.y']: 1,
});

const initialTextProps: TextProps = Object.freeze({
  ['font.name']: 'Helvetica',
  ['font.size']: 36,
});

export type ViewMode = 'graphics' | 'text';

export class BrowserHost implements SupportsSnapshots<BrowserSnapshot> {
  events = new EventEmitter();

  viewMode: ViewMode = 'graphics';

  shapes: readonly Shape[] = emptyArray;
  shapeProps: ShapeProps = initialShapeProps;
  textProps: TextProps = initialTextProps;

  outputBuffer = new StackCell();
  currentCell: Cons<Cell> = new Cons(rootCell);

  restoreOriginalSettings() {
    this.shapes = emptyArray;
    this.shapeProps = initialShapeProps;
    this.textProps = initialTextProps;
    this.outputBuffer = new StackCell();
    this.currentCell = new Cons(rootCell);
  }

  setViewMode(mode: ViewMode) {
    this.viewMode = mode;
    this.events.emit('repaint');
  }

  clearDisplay() {
    this.shapes = emptyArray;
    this.events.emit('repaint');
  }

  pushShape(shape: Shape) {
    this.shapes = produce(this.shapes, (draft) => {
      draft.push(shape);
    });
    this.events.emit('repaint');
  }

  clearOutputBuffer() {
    this.outputBuffer = new StackCell();
    this.events.emit('repaint');
  }

  swapCell(cell: Cell) {
    this.currentCell = this.currentCell.swap(cell);
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
      this.events.emit('repaint');
      return waitForRepaint();
    } else {
      this.swapCell(this.currentCell.head.addChild(cell));
    }
  }

  setConfiguration(name: string, value: unknown) {
    if (name === 'mode') {
      if (value !== 'graphics' && value !== 'text') {
        throw new Error(`invalid mode: ${value}`);
      }
      this.setViewMode(value);
    } else if (name in this.shapeProps) {
      this.shapeProps = produce(this.shapeProps, (draft) => {
        // @ts-expect-error TODO: validate this
        draft[name] = value;
      });
    } else if (name in this.textProps) {
      this.textProps = produce(this.textProps, (draft) => {
        // @ts-expect-error TODO: validate this
        draft[name] = value;
      });
    } else if (this.currentCell.head !== rootCell) {
      const cell = this.currentCell.head;
      if (!(cell instanceof StackCell)) {
        throw new Error('could not set configuration on non-stack cell');
      }
      this.swapCell(cell.updateProp(name, value));
    } else if (name in this.outputBuffer.stackProps) {
      this.outputBuffer = this.outputBuffer.updateProp(name, value);
    } else {
      throw new Error(`could not set configuration option: ${name}`);
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
    host.clearOutputBuffer();
  },

  color(interpreter, [red, green, blue, alpha = 1]: number[]) {
    const r = `${Number((red * 100).toFixed(3))}%`;
    const g = `${Number((green * 100).toFixed(3))}%`;
    const b = `${Number((blue * 100).toFixed(3))}%`;
    const a = `${Number((alpha * 100).toFixed(3))}%`;

    if (alpha === 1) {
      interpreter.setResult(`rgb(${r} ${g} ${b})`);
    } else {
      interpreter.setResult(`rgb(${r} ${g} ${b} / ${a})`);
    }
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

  stack(interpreter, args, node) {
    return new BuildCellFrame(node, new StackCell());
  },

  table(interpreter, args, node) {
    return new BuildCellFrame(node, new GridCell());
  },

  header(interpreter, args, node) {
    return new BuildCellFrame(node, new GridHeaderRowCell());
  },

  row(interpreter, args, node) {
    return new BuildCellFrame(node, new GridRowCell());
  },
};
