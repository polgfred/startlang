import type { MarkerType } from '../types.js';

import { BeginNode } from './begin.js';
import { BlockNode } from './block.js';
import { CallNode } from './call.js';
import { ForInNode } from './for-in.js';
import { ForNode } from './for.js';
import { IfNode } from './if.js';
import { Node } from './base.js';
import { RepeatNode } from './repeat.js';
import { WhileNode } from './while.js';

export function mapMarkers(node: Node, markers: readonly MarkerType[]) {
  const markersCopy = markers.slice();
  const nodeToMarker = new WeakMap<Node, MarkerType>();

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

        if (markersCopy[index]) {
          nodeToMarker.set(child, markersCopy[index]);
          delete markersCopy[index];
        }
      }
    }
  }

  visit(node);

  return nodeToMarker;
}
