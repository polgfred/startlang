import type { MarkerType } from '../types.js';

import { Node } from './base.js';
import { BeginNode } from './begin.js';
import { BlockNode } from './block.js';
import { CallNode } from './call.js';
import { ForInNode } from './for-in.js';
import { ForNode } from './for.js';
import { IfNode } from './if.js';
import { RepeatNode } from './repeat.js';
import { WhileNode } from './while.js';

export interface MarkerMap {
  get(node: Node): MarkerType | undefined;
}

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
  mapMarkers(markers: readonly MarkerType[]): MarkerMap;
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

  visit(node);

  return {
    resolve(lineNumber: number): MarkerResolution | null {
      const markerNode = lineToNode.get(lineNumber);

      if (!markerNode) {
        return null;
      }

      return {
        node: markerNode,
        lineNumber: markerNode.location.start.line,
      };
    },
    mapMarkers(markers: readonly MarkerType[]) {
      return {
        get(node: Node) {
          const lines = nodeToLines.get(node);
          if (lines) {
            for (const lineNumber of lines) {
              const marker = markers[lineNumber];
              if (marker) {
                return marker;
              }
            }
          }
        },
      };
    },
  };
}

export function mapMarkers(node: Node, markers: readonly MarkerType[]) {
  return buildMarkerLineMap(node).mapMarkers(markers);
}
