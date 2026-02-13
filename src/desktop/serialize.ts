import {
  BrowserHost,
  type BrowserSnapshot,
} from '../lang/ext/browser.js';
import {
  Cell,
  GridCell,
  GridHeaderRowCell,
  GridRowCell,
  StackCell,
  ValueCell,
} from '../lang/ext/cells/index.js';
import {
  Circle,
  Ellipse,
  Line,
  Polygon,
  Rect,
  Shape,
  Text,
} from '../lang/ext/shapes/index.js';
import type { Interpreter } from '../lang/interpreter.js';

import type {
  CellSnapshot,
  EngineSnapshotState,
  ShapeSnapshot,
  TraceBundle,
} from './types.js';

function serializeValue(value: unknown, depth = 0): unknown {
  if (depth > 20) {
    return '*depth-limit*';
  }
  if (
    value === null ||
    typeof value === 'string' ||
    typeof value === 'boolean' ||
    typeof value === 'number'
  ) {
    return value;
  }
  if (Array.isArray(value)) {
    return value.map((item) => serializeValue(item, depth + 1));
  }
  if (typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>).map(
      ([key, nested]) => [key, serializeValue(nested, depth + 1)] as const
    );
    return Object.fromEntries(entries);
  }
  return String(value);
}

function serializeShape(shape: Shape): ShapeSnapshot {
  const {
    opacity,
    anchor,
    rotate,
    ['fill.color']: fill,
    ['stroke.color']: stroke,
    ['stroke.width']: strokeWidth,
    ['scale.x']: scaleX,
    ['scale.y']: scaleY,
  } = shape.shapeProps;

  const style: ShapeSnapshot['style'] = {
    opacity: opacity !== 1 ? opacity : undefined,
    fill: fill ?? undefined,
    stroke: stroke ?? undefined,
    strokeWidth: strokeWidth !== 1 ? strokeWidth : undefined,
    transformOrigin: anchor || undefined,
    transformBox: anchor ? 'fill-box' : undefined,
  };

  let transform = '';
  if (rotate !== 0) {
    transform += `rotate(${rotate})`;
  }
  if (scaleX !== 1 || scaleY !== 1) {
    transform += ` scale(${scaleX} ${scaleY})`;
  }

  if (shape instanceof Circle) {
    return {
      kind: 'circle',
      cx: shape.cx,
      cy: shape.cy,
      r: shape.r,
      style,
      transform: transform || undefined,
    };
  }
  if (shape instanceof Ellipse) {
    return {
      kind: 'ellipse',
      cx: shape.cx,
      cy: shape.cy,
      rx: shape.rx,
      ry: shape.ry,
      style,
      transform: transform || undefined,
    };
  }
  if (shape instanceof Line) {
    return {
      kind: 'line',
      x1: shape.x1,
      y1: shape.y1,
      x2: shape.x2,
      y2: shape.y2,
      style,
      transform: transform || undefined,
    };
  }
  if (shape instanceof Polygon) {
    return {
      kind: 'polygon',
      points: shape.points,
      style,
      transform: transform || undefined,
    };
  }
  if (shape instanceof Rect) {
    return {
      kind: 'rect',
      x: shape.x,
      y: shape.y,
      width: shape.width,
      height: shape.height,
      style,
      transform: transform || undefined,
    };
  }
  if (shape instanceof Text) {
    return {
      kind: 'text',
      x: shape.x,
      y: shape.y,
      text: shape.text,
      style: {
        ...style,
        fontFamily: shape.textProps['font.name'] || undefined,
        fontSize: shape.textProps['font.size'] || undefined,
      },
      transform: transform || undefined,
    };
  }

  throw new Error('unknown shape type');
}

function serializeCell(cell: Cell): CellSnapshot {
  if (cell instanceof ValueCell) {
    return {
      kind: 'value',
      value: cell.value,
      variant: cell.variant,
    };
  }
  if (cell instanceof StackCell) {
    return {
      kind: 'stack',
      direction: cell.stackProps.direction,
      align: cell.stackProps.align,
      justify: cell.stackProps.justify,
      children: cell.children.map(serializeCell),
    };
  }
  if (cell instanceof GridCell) {
    return {
      kind: 'grid',
      headers: cell.headers.map(serializeCell),
      rows: cell.rows.map(serializeCell),
    };
  }
  if (cell instanceof GridHeaderRowCell || cell instanceof GridRowCell) {
    return {
      kind: 'row',
      isHeader: cell instanceof GridHeaderRowCell,
      cells: cell.children.map(serializeCell),
    };
  }
  throw new Error('unknown cell type');
}

export function serializeCurrentState(
  interpreter: Interpreter,
  host: BrowserHost
): EngineSnapshotState {
  return {
    viewMode: host.viewMode,
    shapes: host.shapes.map(serializeShape),
    output: serializeCell(host.outputBuffer),
    globalNamespace: serializeValue(interpreter.globalNamespace) as Record<
      string,
      unknown
    >,
    localNamespace: serializeValue(interpreter.topNamespace.head) as Record<
      string,
      unknown
    >,
    snapshotIndex: interpreter.snapshotIndex,
    snapshotCount: interpreter.history.length,
  };
}

function serializeSnapshot(
  hostSnapshot: BrowserSnapshot,
  globalNamespace: Record<string, unknown>,
  localNamespace: Record<string, unknown>,
  index: number,
  total: number
): EngineSnapshotState {
  return {
    viewMode: 'graphics',
    shapes: hostSnapshot.shapes.map(serializeShape),
    output: serializeCell(hostSnapshot.outputBuffer),
    globalNamespace: serializeValue(globalNamespace) as Record<string, unknown>,
    localNamespace: serializeValue(localNamespace) as Record<string, unknown>,
    snapshotIndex: index,
    snapshotCount: total,
  };
}

export function serializeTraceBundle(
  source: string,
  interpreter: Interpreter
): TraceBundle {
  const total = interpreter.history.length;
  const snapshots = interpreter.history.map((snapshot, index) => {
    return serializeSnapshot(
      snapshot.hostSnapshot as BrowserSnapshot,
      snapshot.globalNamespace as Record<string, unknown>,
      snapshot.topNamespace.head as Record<string, unknown>,
      index,
      total
    );
  });

  return {
    source,
    generatedAt: new Date().toISOString(),
    snapshots,
  };
}
