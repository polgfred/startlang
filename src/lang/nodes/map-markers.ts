import { Node } from './base';
import { BeginNode } from './begin';
import { BlockNode } from './block';
import { CallNode } from './call';
import { ForNode } from './for';
import { ForInNode } from './for-in';
import { IfNode } from './if';
import { RepeatNode } from './repeat';
import { WhileNode } from './while';

type MarkerType = 'breakpoint' | 'snapshot';

export function mapMarkers(node: BlockNode, markers: MarkerType[]) {
  // we're going to remove these as we find them, so don't modify the original
  markers = markers.slice();

  // build a map from program nodes to markers (either 'breakpoint' or 'snapshot')
  const nodeToMarker = new Map<Node, MarkerType>();

  function visit(node: Node | null) {
    if (!(node instanceof BlockNode)) {
      return;
    }

    let index = node.location.start.line;

    for (const child of node.elems) {
      const { end } = child.location;

      for (; index <= end.line; ++index) {
        // if this node has any blocks, give them a chance to claim the marker first
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

        // if we have a marker for this line, assign it to this node
        if (markers[index]) {
          nodeToMarker.set(child, markers[index]);
          // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
          delete markers[index];
        }
      }
    }
  }

  visit(node);

  return nodeToMarker;
}
