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

export function mapMarkers(node: Node, markers: readonly MarkerType[]) {
  const nodeToLines = new WeakMap<Node, number[]>();
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
    claimedLines.add(lineNumber);
  }

  function visit(node: Node | null) {
    if (!(node instanceof BlockNode)) {
      return;
    }

    let index = node.location.start.line;

    for (const child of node.elems) {
      const { end } = child.location;

      for (; index <= end.line; ++index) {
        if (
          child instanceof BeginNode ||
          child instanceof CallNode ||
          child instanceof ForInNode ||
          child instanceof ForNode ||
          child instanceof WhileNode ||
          child instanceof RepeatNode
        ) {
          visit(child.body);
        } else if (child instanceof IfNode) {
          visit(child.thenBody);
          visit(child.elseBody);
        }

        addLine(child, index);
      }
    }
  }

  visit(node);

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
}
