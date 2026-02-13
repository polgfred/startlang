export type ViewMode = 'graphics' | 'text';

export interface ShapeStyle {
  opacity?: number;
  transform?: string;
  fill?: string;
  stroke?: string;
  strokeWidth?: number;
  transformOrigin?: string;
  transformBox?: 'fill-box';
  fontFamily?: string;
  fontSize?: number;
}

export type ShapeSnapshot =
  | {
      kind: 'circle';
      cx: number;
      cy: number;
      r: number;
      style: ShapeStyle;
      transform?: string;
    }
  | {
      kind: 'ellipse';
      cx: number;
      cy: number;
      rx: number;
      ry: number;
      style: ShapeStyle;
      transform?: string;
    }
  | {
      kind: 'line';
      x1: number;
      y1: number;
      x2: number;
      y2: number;
      style: ShapeStyle;
      transform?: string;
    }
  | {
      kind: 'polygon';
      points: readonly [number, number][];
      style: ShapeStyle;
      transform?: string;
    }
  | {
      kind: 'rect';
      x: number;
      y: number;
      width: number;
      height: number;
      style: ShapeStyle;
      transform?: string;
    }
  | {
      kind: 'text';
      x: number;
      y: number;
      text: string;
      style: ShapeStyle;
      transform?: string;
    };

export type CellSnapshot =
  | {
      kind: 'value';
      value: string;
      variant: 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6' | 'body1' | 'body2';
    }
  | {
      kind: 'stack';
      direction: 'row' | 'column';
      align: string;
      justify: string;
      children: readonly CellSnapshot[];
    }
  | {
      kind: 'grid';
      headers: readonly CellSnapshot[];
      rows: readonly CellSnapshot[];
    }
  | {
      kind: 'row';
      isHeader: boolean;
      cells: readonly CellSnapshot[];
    };

export interface EngineSnapshotState {
  viewMode: ViewMode;
  shapes: readonly ShapeSnapshot[];
  output: CellSnapshot;
  globalNamespace: Record<string, unknown>;
  localNamespace: Record<string, unknown>;
  snapshotIndex: number;
  snapshotCount: number;
}

export interface EngineErrorState {
  message: string;
  stack?: string;
}

export interface EngineRunResult {
  state: EngineSnapshotState;
  error: EngineErrorState | null;
}

export interface TraceBundle {
  source: string;
  generatedAt: string;
  snapshots: readonly EngineSnapshotState[];
}
