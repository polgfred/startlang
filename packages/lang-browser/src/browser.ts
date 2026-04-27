import type { PresentationHost } from '@startlang/lang-core/host';
import { Interpreter, repaintEffect } from '@startlang/lang-core/interpreter';
import { CallFrame, CallNode } from '@startlang/lang-core/nodes';
import type { RuntimeFunctions } from '@startlang/lang-core/types';
import { Cons } from '@startlang/lang-core/utils/cons';
import { produce } from 'immer';

import {
  Cell,
  GridCell,
  GridHeaderRowCell,
  GridRowCell,
  initialStackProps,
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
  ShapeGroup,
  rootShapeGroup,
} from './shapes/index.js';

interface GraphicConfig {
  shapeProps: ShapeProps;
  textProps: TextProps;
}

interface CellConfig {
  props: Readonly<Record<string, unknown>>;
}

export interface BrowserPresentationSnapshot {
  shapes: readonly Shape[];
  outputCells: readonly Cell[];
  currentCell: Cons<Cell>;
  currentShapeGroup: Cons<ShapeGroup>;
  graphicConfig: Cons<GraphicConfig>;
  cellConfig: Cons<CellConfig>;
}

const emptyArray = Object.freeze([]);
const emptyObject = Object.freeze(Object.create(null));

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

const initialGraphicConfig: GraphicConfig = Object.freeze({
  shapeProps: initialShapeProps,
  textProps: initialTextProps,
});

const initialCellConfig: CellConfig = Object.freeze({
  props: emptyObject,
});

const stackPropNames = new Set(Object.keys(initialStackProps));
const valuePropNames = new Set(['variant']);
const cellPropNames = new Set([...stackPropNames, ...valuePropNames]);
const shapePropNames = new Set(Object.keys(initialShapeProps));
const textPropNames = new Set(Object.keys(initialTextProps));
const graphicPropNames = new Set([...shapePropNames, ...textPropNames]);
const noPropNames = new Set<string>();

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function splitProps(args: readonly unknown[]) {
  if (args.length > 0 && isRecord(args[0])) {
    return [args[0], args.slice(1)] as const;
  }
  return [emptyObject, args] as const;
}

function pickProps(
  props: Readonly<Record<string, unknown>>,
  names: ReadonlySet<string>
) {
  const picked: Record<string, unknown> = {};
  for (const [name, value] of Object.entries(props)) {
    if (names.has(name)) {
      picked[name] = value;
    }
  }
  return picked;
}

function assertKnownProps(
  props: Readonly<Record<string, unknown>>,
  names: ReadonlySet<string>,
  target: string
) {
  for (const name of Object.keys(props)) {
    if (!names.has(name)) {
      throw new Error(`invalid ${target} prop: ${name}`);
    }
  }
}

function mergeShapeProps(
  props: ShapeProps,
  overrides: Readonly<Record<string, unknown>>
) {
  assertKnownProps(overrides, shapePropNames, 'shape');
  return produce(props, (draft) => {
    for (const [name, value] of Object.entries(overrides)) {
      // @ts-expect-error dynamic config keys are validated above
      draft[name] = value;
    }
  });
}

function mergeTextProps(
  props: TextProps,
  overrides: Readonly<Record<string, unknown>>
) {
  assertKnownProps(overrides, textPropNames, 'text');
  return produce(props, (draft) => {
    for (const [name, value] of Object.entries(overrides)) {
      // @ts-expect-error dynamic config keys are validated above
      draft[name] = value;
    }
  });
}

function getValueVariant(props: Readonly<Record<string, unknown>>) {
  const variant = props.variant;
  return typeof variant === 'string' ? variant : undefined;
}

export class BrowserPresentationHost
  implements PresentationHost<BrowserPresentationSnapshot>
{
  shapes: readonly Shape[] = emptyArray;
  outputCells: readonly Cell[] = emptyArray;

  currentCell: Cons<Cell> = new Cons(rootCell);
  currentShapeGroup: Cons<ShapeGroup> = new Cons(rootShapeGroup);
  graphicConfig: Cons<GraphicConfig> = new Cons(initialGraphicConfig);
  cellConfig: Cons<CellConfig> = new Cons(initialCellConfig);

  get shapeProps() {
    return this.graphicConfig.head.shapeProps;
  }

  get textProps() {
    return this.graphicConfig.head.textProps;
  }

  restoreOriginalSettings() {
    this.shapes = emptyArray;
    this.outputCells = emptyArray;
    this.currentCell = new Cons(rootCell);
    this.currentShapeGroup = new Cons(rootShapeGroup);
    this.graphicConfig = new Cons(initialGraphicConfig);
    this.cellConfig = new Cons(initialCellConfig);
  }

  clearDisplay() {
    this.shapes = emptyArray;
  }

  pushShape(shape: Shape) {
    if (this.isBuildingCells()) {
      throw new Error('cannot create graphics inside a cell container');
    }

    if (this.currentShapeGroup.head === rootShapeGroup) {
      this.shapes = produce(this.shapes, (draft) => {
        draft.push(shape);
      });
    } else {
      this.swapShapeGroup(this.currentShapeGroup.head.addChild(shape));
    }
  }

  clearOutputBuffer() {
    this.outputCells = emptyArray;
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

  beginCellContainer(cell: Cell) {
    if (this.isBuildingGraphics()) {
      throw new Error('cannot create cells inside a graphics group');
    }

    this.cellConfig = this.cellConfig.push(this.cellConfig.head);
    this.pushCell(cell);
  }

  endCellContainer() {
    const cell = this.popCell();
    this.cellConfig = this.cellConfig.pop();
    return cell;
  }

  addCell(cell: Cell) {
    if (this.isBuildingGraphics()) {
      throw new Error('cannot create cells inside a graphics group');
    }

    if (this.currentCell.head === rootCell) {
      this.outputCells = produce(this.outputCells, (draft) => {
        draft.push(cell);
      });
    } else {
      this.swapCell(this.currentCell.head.addChild(cell));
    }
  }

  getInProgressOutputCells() {
    if (this.currentCell.head === rootCell) {
      return this.outputCells;
    }

    let child = this.currentCell.head;
    let cursor = this.currentCell.tail;

    while (cursor && cursor.head !== rootCell) {
      child = cursor.head.addChild(child);
      cursor = cursor.tail;
    }

    return [...this.outputCells, child];
  }

  swapShapeGroup(group: ShapeGroup) {
    this.currentShapeGroup = this.currentShapeGroup.swap(group);
  }

  beginShapeGroup(group: ShapeGroup) {
    if (this.isBuildingCells()) {
      throw new Error('cannot create graphics inside a cell container');
    }

    this.graphicConfig = this.graphicConfig.push(this.graphicConfig.head);
    this.currentShapeGroup = this.currentShapeGroup.push(group);
  }

  endShapeGroup() {
    const group = this.currentShapeGroup.head;
    this.currentShapeGroup = this.currentShapeGroup.pop();
    this.graphicConfig = this.graphicConfig.pop();
    return group;
  }

  isBuildingCells() {
    return this.currentCell.head !== rootCell;
  }

  isBuildingGraphics() {
    return this.currentShapeGroup.head !== rootShapeGroup;
  }

  getCellProps(overrides: Readonly<Record<string, unknown>>) {
    const props = {
      ...this.cellConfig.head.props,
      ...overrides,
    };
    assertKnownProps(overrides, cellPropNames, 'cell');
    return props;
  }

  getValueProps(overrides: Readonly<Record<string, unknown>>) {
    assertKnownProps(overrides, valuePropNames, 'value');
    return {
      ...pickProps(this.cellConfig.head.props, valuePropNames),
      ...overrides,
    };
  }

  getStackProps(overrides: Readonly<Record<string, unknown>>) {
    assertKnownProps(overrides, stackPropNames, 'stack');
    const props = {
      ...this.cellConfig.head.props,
      ...overrides,
    };
    return StackCell.mergeProps(initialStackProps, pickProps(props, stackPropNames));
  }

  getShapeProps(overrides: Readonly<Record<string, unknown>> = emptyObject) {
    return mergeShapeProps(this.shapeProps, overrides);
  }

  getTextProps(overrides: Readonly<Record<string, unknown>> = emptyObject) {
    return mergeTextProps(this.textProps, pickProps(overrides, textPropNames));
  }

  setConfiguration(name: string, value: unknown) {
    if (this.isBuildingGraphics()) {
      this.setGraphicConfiguration(name, value);
    } else if (this.isBuildingCells()) {
      this.setCellConfiguration(name, value);
    } else if (graphicPropNames.has(name)) {
      this.setGraphicConfiguration(name, value);
    } else if (cellPropNames.has(name)) {
      this.setCellConfiguration(name, value);
    } else {
      throw new Error(`could not set configuration option: ${name}`);
    }
  }

  private setGraphicConfiguration(name: string, value: unknown) {
    if (shapePropNames.has(name)) {
      this.graphicConfig = this.graphicConfig.swap({
        ...this.graphicConfig.head,
        shapeProps: mergeShapeProps(this.shapeProps, { [name]: value }),
      });
    } else if (textPropNames.has(name)) {
      this.graphicConfig = this.graphicConfig.swap({
        ...this.graphicConfig.head,
        textProps: mergeTextProps(this.textProps, { [name]: value }),
      });
    } else {
      throw new Error(`could not set graphics configuration option: ${name}`);
    }
  }

  private setCellConfiguration(name: string, value: unknown) {
    if (!cellPropNames.has(name)) {
      throw new Error(`could not set cell configuration option: ${name}`);
    }

    this.cellConfig = this.cellConfig.swap({
      props: {
        ...this.cellConfig.head.props,
        [name]: value,
      },
    });
  }

  takeSnapshot(): BrowserPresentationSnapshot {
    return {
      shapes: this.shapes,
      outputCells: this.outputCells,
      currentCell: this.currentCell,
      currentShapeGroup: this.currentShapeGroup,
      graphicConfig: this.graphicConfig,
      cellConfig: this.cellConfig,
    };
  }

  restoreSnapshot(snapshot: BrowserPresentationSnapshot) {
    this.shapes = snapshot.shapes;
    this.currentCell = snapshot.currentCell;
    this.outputCells = snapshot.outputCells;
    this.currentShapeGroup = snapshot.currentShapeGroup;
    this.graphicConfig = snapshot.graphicConfig;
    this.cellConfig = snapshot.cellConfig;
  }
}

function getPresentationHost(interpreter: Interpreter) {
  if (!(interpreter.host instanceof BrowserPresentationHost)) {
    throw new Error('invalid presentation host for interpreter');
  }
  return interpreter.host;
}

function addPresentationCell(interpreter: Interpreter, cell: Cell) {
  const host = getPresentationHost(interpreter);

  host.addCell(cell);
  interpreter.setEffect(repaintEffect);
}

class BuildCellFrame extends CallFrame {
  constructor(
    node: CallNode,
    readonly cell: Cell
  ) {
    super(node);
  }

  visit(interpreter: Interpreter) {
    const host = getPresentationHost(interpreter);
    const { body } = this.node;

    switch (this.state) {
      case 0: {
        if (body) {
          host.beginCellContainer(this.cell);
          interpreter.swapFrame(this, 1);
          interpreter.pushFrame(body);
        } else {
          interpreter.popFrame();
        }
        break;
      }
      case 1: {
        interpreter.swapFrame(this, 2);
        addPresentationCell(interpreter, host.endCellContainer());
        break;
      }
      case 2: {
        interpreter.popFrame();
        break;
      }
    }
  }
}

class BuildShapeGroupFrame extends CallFrame {
  constructor(
    node: CallNode,
    readonly group: ShapeGroup
  ) {
    super(node);
  }

  visit(interpreter: Interpreter) {
    const host = getPresentationHost(interpreter);
    const { body } = this.node;

    switch (this.state) {
      case 0: {
        if (body) {
          host.beginShapeGroup(this.group);
          interpreter.swapFrame(this, 1);
          interpreter.pushFrame(body);
        } else {
          interpreter.popFrame();
        }
        break;
      }
      case 1: {
        interpreter.swapFrame(this, 2);
        host.pushShape(host.endShapeGroup());
        interpreter.setEffect(repaintEffect);
        break;
      }
      case 2: {
        interpreter.popFrame();
        break;
      }
    }
  }
}

export const browserPresentationGlobals: RuntimeFunctions = {
  clear(interpreter) {
    const host = getPresentationHost(interpreter);
    host.clearDisplay();
    host.clearOutputBuffer();
    interpreter.setEffect(repaintEffect);
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

  rect(interpreter, args) {
    const [props, rest] = splitProps(args);
    const [x, y, width, height] = rest as [number, number, number, number];
    const host = getPresentationHost(interpreter);
    host.pushShape(new Rect(x, y, width, height, host.getShapeProps(props)));
    interpreter.setEffect(repaintEffect);
  },

  circle(interpreter, args) {
    const [props, rest] = splitProps(args);
    const [cx, cy, radius] = rest as [number, number, number];
    const host = getPresentationHost(interpreter);
    host.pushShape(new Circle(cx, cy, radius, host.getShapeProps(props)));
    interpreter.setEffect(repaintEffect);
  },

  ellipse(interpreter, args) {
    const [props, rest] = splitProps(args);
    const [cx, cy, rx, ry] = rest as [number, number, number, number];
    const host = getPresentationHost(interpreter);
    host.pushShape(new Ellipse(cx, cy, rx, ry, host.getShapeProps(props)));
    interpreter.setEffect(repaintEffect);
  },

  line(interpreter, args) {
    const [props, rest] = splitProps(args);
    const [x1, y1, x2, y2] = rest as [number, number, number, number];
    const host = getPresentationHost(interpreter);
    host.pushShape(new Line(x1, y1, x2, y2, host.getShapeProps(props)));
    interpreter.setEffect(repaintEffect);
  },

  polygon(interpreter, args) {
    const [props, rest] = splitProps(args);
    const [points] = rest as [[number, number][]];
    const host = getPresentationHost(interpreter);
    host.pushShape(new Polygon(points, host.getShapeProps(props)));
    interpreter.setEffect(repaintEffect);
  },

  text(interpreter, args) {
    const [props, rest] = splitProps(args);
    const [x, y, text] = rest as [number, number, string];
    const host = getPresentationHost(interpreter);
    assertKnownProps(props, graphicPropNames, 'text');
    host.pushShape(
      new Text(
        x,
        y,
        text,
        host.getTextProps(pickProps(props, textPropNames)),
        host.getShapeProps(pickProps(props, shapePropNames))
      )
    );
    interpreter.setEffect(repaintEffect);
  },

  group(interpreter, args, node) {
    const [props] = splitProps(args);
    const host = getPresentationHost(interpreter);
    return new BuildShapeGroupFrame(node, new ShapeGroup(host.getShapeProps(props)));
  },

  heading(interpreter, args) {
    const [props, [value, level = 1]] = splitProps(args);
    const host = getPresentationHost(interpreter);
    const cellProps = host.getValueProps(props);
    const handler = interpreter.getHandler(value);
    addPresentationCell(
      interpreter,
      new ValueCell(handler.getPrettyValue(value), getValueVariant(cellProps) ?? `h${level}`)
    );
  },

  print(interpreter, args) {
    const [props, [value]] = splitProps(args);
    const host = getPresentationHost(interpreter);
    const cellProps = host.getValueProps(props);
    const handler = interpreter.getHandler(value);
    addPresentationCell(
      interpreter,
      new ValueCell(handler.getPrettyValue(value), getValueVariant(cellProps))
    );
  },

  stack(interpreter, args, node) {
    const [props] = splitProps(args);
    const host = getPresentationHost(interpreter);
    return new BuildCellFrame(node, new StackCell(host.getStackProps(props)));
  },

  table(interpreter, args, node) {
    const [props] = splitProps(args);
    assertKnownProps(props, noPropNames, 'table');
    return new BuildCellFrame(node, new GridCell());
  },

  header(interpreter, args, node) {
    const [props] = splitProps(args);
    assertKnownProps(props, noPropNames, 'header');
    return new BuildCellFrame(node, new GridHeaderRowCell());
  },

  row(interpreter, args, node) {
    const [props] = splitProps(args);
    assertKnownProps(props, noPropNames, 'row');
    return new BuildCellFrame(node, new GridRowCell());
  },
};
