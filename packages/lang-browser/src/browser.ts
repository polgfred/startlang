import {
  define,
  defineWithProps,
  T,
} from '@startlang/lang-core/builtins/types';
import type { SupportsSnapshots } from '@startlang/lang-core/host';
import { Interpreter, repaintEffect } from '@startlang/lang-core/interpreter';
import { CallBodyFrame, CallNode } from '@startlang/lang-core/nodes';
import type { RuntimeFunctions } from '@startlang/lang-core/types';
import { Cons } from '@startlang/lang-core/utils/cons';
import { produce } from 'immer';

import {
  Cell,
  GridCell,
  GridHeaderRowCell,
  GridRowCell,
  GridSlotCell,
  initialGridSlotProps,
  initialStackProps,
  initialValueProps,
  initialValueTextProps,
  StackCell,
  ValueCell,
  rootCell,
} from './cells/index.js';
import {
  CanonicalProps,
  normalizeProps,
  PropContext,
  propContexts,
  selectProps,
} from './presentation-props.js';
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
  props: CanonicalProps;
}

interface CellConfig {
  props: CanonicalProps;
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
  ['translate.x']: 0,
  ['translate.y']: 0,
  ['scale.x']: 1,
  ['scale.y']: 1,
});

const initialGroupProps: ShapeProps = Object.freeze({
  ...initialShapeProps,
  anchor: '',
  ['fill.color']: null,
  ['stroke.color']: null,
  ['stroke.width']: 0,
});

const initialTextProps: TextProps = Object.freeze({
  ['font.name']: 'Helvetica',
  ['font.size']: 36,
  ['font.weight']: null,
});

const initialGraphicConfig: GraphicConfig = Object.freeze({
  props: emptyObject,
});

const initialCellConfig: CellConfig = Object.freeze({
  props: emptyObject,
});

function mergeProps<T extends object>(
  props: T,
  overrides: Readonly<Record<string, unknown>>
) {
  return produce(props, (draft) => {
    for (const [name, value] of Object.entries(overrides)) {
      // @ts-expect-error dynamic config keys are validated above
      draft[name] = value;
    }
  });
}

function selectInheritedGroupProps(props: CanonicalProps) {
  return Object.fromEntries(
    [
      'shape.rotate',
      'shape.translate.x',
      'shape.translate.y',
      'shape.scale.x',
      'shape.scale.y',
    ].flatMap((key) => (key in props ? [[key, props[key]]] : []))
  );
}

export class BrowserPresentationHost
  implements SupportsSnapshots<BrowserPresentationSnapshot>
{
  cells: readonly Cell[] = emptyArray;
  currentCell: Cons<Cell> = new Cons(rootCell);
  cellConfig: Cons<CellConfig> = new Cons(initialCellConfig);

  shapes: readonly Shape[] = emptyArray;
  currentGroup: Cons<ShapeGroup> = new Cons(rootShapeGroup);
  graphicConfig: Cons<GraphicConfig> = new Cons(initialGraphicConfig);

  get shapeProps() {
    return mergeProps(
      initialShapeProps,
      selectProps(this.graphicConfig.head.props, 'shape')
    );
  }

  get textProps() {
    return mergeProps(
      initialTextProps,
      selectProps(this.graphicConfig.head.props, 'text')
    );
  }

  restoreOriginalSettings() {
    this.shapes = emptyArray;
    this.cells = emptyArray;
    this.currentCell = new Cons(rootCell);
    this.currentGroup = new Cons(rootShapeGroup);
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

    if (this.currentGroup.head === rootShapeGroup) {
      this.shapes = produce(this.shapes, (draft) => {
        draft.push(shape);
      });
    } else {
      this.swapShapeGroup(this.currentGroup.head.addChild(shape));
    }
  }

  clearOutputBuffer() {
    this.cells = emptyArray;
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
      this.cells = produce(this.cells, (draft) => {
        draft.push(cell);
      });
    } else {
      this.swapCell(this.currentCell.head.addChild(cell));
    }
  }

  getInProgressCells() {
    if (this.currentCell.head === rootCell) {
      return this.cells;
    }

    let child = this.currentCell.head;
    let cursor = this.currentCell.tail;

    while (cursor && cursor.head !== rootCell) {
      child = cursor.head.addChild(child);
      cursor = cursor.tail;
    }

    return [...this.cells, child];
  }

  getInProgressShapes() {
    if (this.currentGroup.head === rootShapeGroup) {
      return this.shapes;
    }

    let child = this.currentGroup.head;
    let cursor = this.currentGroup.tail;

    while (cursor && cursor.head !== rootShapeGroup) {
      child = cursor.head.addChild(child);
      cursor = cursor.tail;
    }

    return [...this.shapes, child];
  }

  swapShapeGroup(group: ShapeGroup) {
    this.currentGroup = this.currentGroup.swap(group);
  }

  beginShapeGroup(group: ShapeGroup) {
    if (this.isBuildingCells()) {
      throw new Error('cannot create graphics inside a cell container');
    }

    this.graphicConfig = this.graphicConfig.push(this.graphicConfig.head);
    this.currentGroup = this.currentGroup.push(group);
  }

  endShapeGroup() {
    const group = this.currentGroup.head;
    this.currentGroup = this.currentGroup.pop();
    this.graphicConfig = this.graphicConfig.pop();
    return group;
  }

  isBuildingCells() {
    return this.currentCell.head !== rootCell;
  }

  isBuildingGraphics() {
    return this.currentGroup.head !== rootShapeGroup;
  }

  isBuildingGridRow() {
    return this.currentCell.head instanceof GridRowCell;
  }

  getValueProps(
    overrides: Readonly<Record<string, unknown>>,
    defaultVariant: string = initialValueProps.variant,
    context: PropContext = propContexts.value
  ) {
    const props = {
      ...this.cellConfig.head.props,
      ...normalizeProps(overrides, context),
    };
    return ValueCell.mergeProps(initialValueProps, {
      variant: defaultVariant,
      ...selectProps(props, 'value'),
    });
  }

  getValueTextProps(
    overrides: Readonly<Record<string, unknown>>,
    context: PropContext = propContexts.value
  ) {
    const props = {
      ...this.cellConfig.head.props,
      ...normalizeProps(overrides, context),
    };
    return mergeProps(initialValueTextProps, selectProps(props, 'text'));
  }

  getStackProps(overrides: Readonly<Record<string, unknown>>) {
    const props = {
      ...this.cellConfig.head.props,
      ...normalizeProps(overrides, propContexts.stack),
    };
    return StackCell.mergeProps(initialStackProps, selectProps(props, 'stack'));
  }

  getCellProps(overrides: Readonly<Record<string, unknown>>) {
    const props = {
      ...this.cellConfig.head.props,
      ...normalizeProps(overrides, propContexts.cellValue),
    };
    return GridSlotCell.mergeProps(
      initialGridSlotProps,
      selectProps(props, 'cell')
    );
  }

  getShapeProps(
    overrides: Readonly<Record<string, unknown>> = emptyObject,
    context: PropContext = propContexts.shape
  ) {
    return mergeProps(
      this.shapeProps,
      selectProps(normalizeProps(overrides, context), 'shape')
    );
  }

  getGroupProps(overrides: Readonly<Record<string, unknown>> = emptyObject) {
    const configProps = selectInheritedGroupProps(
      this.graphicConfig.head.props
    );
    const overrideProps = normalizeProps(overrides, propContexts.shape);
    return mergeProps(
      initialGroupProps,
      selectProps({ ...configProps, ...overrideProps }, 'shape')
    );
  }

  getTextProps(
    overrides: Readonly<Record<string, unknown>> = emptyObject,
    context: PropContext = propContexts.text
  ) {
    return mergeProps(
      this.textProps,
      selectProps(normalizeProps(overrides, context), 'text')
    );
  }

  setConfiguration(name: string, value: unknown) {
    if (this.isBuildingGraphics()) {
      this.setConfigurationProp(name, value, propContexts.graphics, 'graphic');
    } else if (this.isBuildingCells()) {
      this.setConfigurationProp(name, value, propContexts.cells, 'cell');
    } else {
      const prop = normalizeProps({ [name]: value }, propContexts.root);
      const [key, resolvedValue] = Object.entries(prop)[0];
      if (key.startsWith('shape.')) {
        this.setGraphicConfiguration(key, resolvedValue);
      } else if (key.startsWith('text.')) {
        this.setGraphicConfiguration(key, resolvedValue);
        this.setCellConfiguration(key, resolvedValue);
      } else {
        this.setCellConfiguration(key, resolvedValue);
      }
    }
  }

  private setConfigurationProp(
    name: string,
    value: unknown,
    context: PropContext,
    target: 'graphic' | 'cell'
  ) {
    const prop = normalizeProps({ [name]: value }, context);
    const [key, resolvedValue] = Object.entries(prop)[0];
    if (target === 'graphic') {
      this.setGraphicConfiguration(key, resolvedValue);
    } else {
      this.setCellConfiguration(key, resolvedValue);
    }
  }

  private setGraphicConfiguration(name: string, value: unknown) {
    this.graphicConfig = this.graphicConfig.swap(
      produce(this.graphicConfig.head, (draft) => {
        draft.props[name] = value;
      })
    );
  }

  private setCellConfiguration(name: string, value: unknown) {
    this.cellConfig = this.cellConfig.swap(
      produce(this.cellConfig.head, (draft) => {
        draft.props[name] = value;
      })
    );
  }

  takeSnapshot(): BrowserPresentationSnapshot {
    return {
      shapes: this.shapes,
      outputCells: this.cells,
      currentCell: this.currentCell,
      currentShapeGroup: this.currentGroup,
      graphicConfig: this.graphicConfig,
      cellConfig: this.cellConfig,
    };
  }

  restoreSnapshot(snapshot: BrowserPresentationSnapshot) {
    this.shapes = snapshot.shapes;
    this.currentCell = snapshot.currentCell;
    this.cells = snapshot.outputCells;
    this.currentGroup = snapshot.currentShapeGroup;
    this.graphicConfig = snapshot.graphicConfig;
    this.cellConfig = snapshot.cellConfig;
  }
}

export function buildBrowserGlobals(
  host: BrowserPresentationHost
): RuntimeFunctions {
  function addPresentationCell(interpreter: Interpreter, cell: Cell) {
    host.addCell(cell);
    interpreter.setEffect(repaintEffect);
  }

  function addPresentationShape(interpreter: Interpreter, shape: Shape) {
    host.pushShape(shape);
    interpreter.setEffect(repaintEffect);
  }

  class BuildCellFrame extends CallBodyFrame {
    constructor(
      node: CallNode,
      readonly cell: Cell
    ) {
      super(node);
    }

    visit(interpreter: Interpreter) {
      const { body } = this.node;

      switch (this.state) {
        case 0: {
          if (body) {
            host.beginCellContainer(this.cell);
            interpreter.swapFrame(1);
            interpreter.pushNode(body);
          } else {
            interpreter.popFrame();
          }
          break;
        }
        case 1: {
          interpreter.swapFrame(2);
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

  class BuildShapeGroupFrame extends CallBodyFrame {
    constructor(
      node: CallNode,
      readonly group: ShapeGroup
    ) {
      super(node);
    }

    visit(interpreter: Interpreter) {
      const { body } = this.node;

      switch (this.state) {
        case 0: {
          if (body) {
            host.beginShapeGroup(this.group);
            interpreter.swapFrame(1);
            interpreter.pushNode(body);
          } else {
            interpreter.popFrame();
          }
          break;
        }
        case 1: {
          interpreter.swapFrame(2);
          addPresentationShape(interpreter, host.endShapeGroup());
          break;
        }
        case 2: {
          interpreter.popFrame();
          break;
        }
      }
    }
  }

  return {
    clear: define([], (interpreter) => {
      host.clearDisplay();
      host.clearOutputBuffer();
      interpreter.setEffect(repaintEffect);
    }),

    color: define(
      [T.number, T.number, T.number, T.optional(T.number)],
      (interpreter, [red, green, blue, alpha = 1]) => {
        const r = `${Number((red * 100).toFixed(3))}%`;
        const g = `${Number((green * 100).toFixed(3))}%`;
        const b = `${Number((blue * 100).toFixed(3))}%`;
        const a = `${Number((alpha * 100).toFixed(3))}%`;

        if (alpha === 1) {
          interpreter.setResult(`rgb(${r} ${g} ${b})`);
        } else {
          interpreter.setResult(`rgb(${r} ${g} ${b} / ${a})`);
        }
      }
    ),

    rect: defineWithProps(
      [T.number, T.number, T.number, T.number],
      (interpreter, props, [x, y, width, height]) => {
        addPresentationShape(
          interpreter,
          new Rect(x, y, width, height, host.getShapeProps(props))
        );
      }
    ),

    circle: defineWithProps(
      [T.number, T.number, T.number],
      (interpreter, props, [cx, cy, radius]) => {
        addPresentationShape(
          interpreter,
          new Circle(cx, cy, radius, host.getShapeProps(props))
        );
      }
    ),

    ellipse: defineWithProps(
      [T.number, T.number, T.number, T.number],
      (interpreter, props, [cx, cy, rx, ry]) => {
        addPresentationShape(
          interpreter,
          new Ellipse(cx, cy, rx, ry, host.getShapeProps(props))
        );
      }
    ),

    line: defineWithProps(
      [T.number, T.number, T.number, T.number],
      (interpreter, props, [x1, y1, x2, y2]) => {
        addPresentationShape(
          interpreter,
          new Line(x1, y1, x2, y2, host.getShapeProps(props))
        );
      }
    ),

    polygon: defineWithProps([T.list], (interpreter, props, [points]) => {
      addPresentationShape(
        interpreter,
        new Polygon(points as [number, number][], host.getShapeProps(props))
      );
    }),

    text: defineWithProps(
      [T.number, T.number, T.string],
      (interpreter, props, [x, y, text]) => {
        addPresentationShape(
          interpreter,
          new Text(
            x,
            y,
            text,
            host.getTextProps(props, propContexts.text),
            host.getShapeProps(props, propContexts.text)
          )
        );
      }
    ),

    group: defineWithProps([], (_interpreter, props, _args, node) => {
      return new BuildShapeGroupFrame(
        node,
        new ShapeGroup(host.getGroupProps(props))
      );
    }),

    heading: defineWithProps(
      [T.any, T.optional(T.number)],
      (interpreter, props, [value, level = 1]) => {
        const handler = interpreter.getHandler(value);
        addPresentationCell(
          interpreter,
          new ValueCell(
            handler.getPrettyValue(value),
            host.getValueProps(props, `h${level}`),
            host.getValueTextProps(props)
          )
        );
      }
    ),

    print: defineWithProps([T.any], (interpreter, props, [value]) => {
      const handler = interpreter.getHandler(value);
      addPresentationCell(
        interpreter,
        new ValueCell(
          handler.getPrettyValue(value),
          host.getValueProps(props),
          host.getValueTextProps(props)
        )
      );
    }),

    stack: defineWithProps([], (_interpreter, props, _args, node) => {
      return new BuildCellFrame(node, new StackCell(host.getStackProps(props)));
    }),

    table: defineWithProps([], (_interpreter, _props, _args, node) => {
      return new BuildCellFrame(node, new GridCell());
    }),

    header: defineWithProps([], (_interpreter, _props, _args, node) => {
      return new BuildCellFrame(node, new GridHeaderRowCell());
    }),

    row: defineWithProps([], (_interpreter, _props, _args, node) => {
      return new BuildCellFrame(node, new GridRowCell());
    }),

    cell: defineWithProps(
      [T.optional(T.any)],
      (interpreter, props, [value], node) => {
        if (!host.isBuildingGridRow()) {
          throw new Error('cell can only be used inside a table row');
        }

        const slot = new GridSlotCell(host.getCellProps(props));

        if (node.body) {
          return new BuildCellFrame(node, slot);
        }

        const handler = interpreter.getHandler(value);
        addPresentationCell(
          interpreter,
          slot.addChild(
            new ValueCell(
              handler.getPrettyValue(value),
              host.getValueProps(
                props,
                initialValueProps.variant,
                propContexts.cellValue
              ),
              host.getValueTextProps(props, propContexts.cellValue)
            )
          )
        );
      }
    ),
  };
}
