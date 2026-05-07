import {
  BeginNode,
  BlockNode,
  CallNode,
  ForInNode,
  ForNode,
  IfNode,
  type Node,
  RepeatNode,
  WhileNode,
} from './nodes/index.js';
import type { MarkerType } from './types.js';

export interface MarkerMap {
  get(node: Node): MarkerType | undefined;
}

export type MarkerLineLookup = (lineNumber: number) => MarkerType | undefined;

export const emptyMarkerMap: MarkerMap = {
  get() {
    return undefined;
  },
};

export interface MarkerResolution {
  node: Node;
  lineNumber: number;
}

export interface MarkerLineMap {
  resolve(lineNumber: number): MarkerResolution | null;
  mapMarkers(getMarker: MarkerLineLookup): MarkerMap;
}

export function buildMarkerLineMap(node: Node): MarkerLineMap {
  const nodeToLines = new WeakMap<Node, number[]>();
  const lineToNode = new Map<number, Node>();
  const claimedLines = new Set<number>();

  function addLine(node: Node, lineNumber: number) {
    if (claimedLines.has(lineNumber)) {
      return;
    }

    const lines = nodeToLines.get(node);
    if (lines) {
      lines.push(lineNumber);
    } else {
      nodeToLines.set(node, [lineNumber]);
    }
    lineToNode.set(lineNumber, node);
    claimedLines.add(lineNumber);
  }

  function visit(node: Node, startLine = node.location.start.line) {
    if (!(node instanceof BlockNode)) {
      return;
    }

    let index = startLine ?? node.location.start.line;

    for (const child of node.elems) {
      const { end } = child.location;

      if (
        (child instanceof BeginNode ||
          child instanceof CallNode ||
          child instanceof ForInNode ||
          child instanceof ForNode ||
          child instanceof WhileNode ||
          child instanceof RepeatNode) &&
        child.body
      ) {
        visit(child.body, child.location.start.line + 1);
      } else if (child instanceof IfNode) {
        visit(child.thenBody, child.location.start.line + 1);
        if (child.elseBody) {
          visit(child.elseBody, child.elseBody.location.start.line);
        }
      }

      for (; index <= end.line; ++index) {
        addLine(child, index);
      }
    }
  }

  function resolve(lineNumber: number): MarkerResolution | null {
    const markerNode = lineToNode.get(lineNumber);

    if (!markerNode) {
      return null;
    }

    return {
      node: markerNode,
      lineNumber: markerNode.location.start.line,
    };
  }

  function mapMarkers(getMarker: MarkerLineLookup): MarkerMap {
    return {
      get(node: Node) {
        const lines = nodeToLines.get(node);
        if (lines) {
          for (const lineNumber of lines) {
            const marker = getMarker(lineNumber);
            if (marker) {
              return marker;
            }
          }
        }
      },
    };
  }

  visit(node);

  return {
    mapMarkers,
    resolve,
  };
}

export function mapMarkers(node: Node, markers: readonly MarkerType[]) {
  return buildMarkerLineMap(node).mapMarkers(
    (lineNumber) => markers[lineNumber]
  );
}
