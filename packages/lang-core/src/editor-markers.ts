import {
  BlockNode,
  CallNode,
  ForInNode,
  ForNode,
  IfNode,
  type Node,
  RepeatNode,
  WhileNode,
} from './nodes/index.js';
import { Program } from './program.js';
import type { MarkerType } from './types.js';

export type MarkerMap = (node: Node) => MarkerType | undefined;

export type MarkerLineLookup = (lineNumber: number) => MarkerType | undefined;

export const emptyMarkerMap: MarkerMap = () => undefined;

export interface MarkerLineMap {
  isMarkable(lineNumber: number): boolean;
  markableLines(): readonly number[];
  mapMarkers(getMarker: MarkerLineLookup): MarkerMap;
}

export function buildMarkerLineMap(program: Program): MarkerLineMap {
  const lineToNode = new Map<number, Node>();

  function visit(node: Node) {
    if (!(node instanceof BlockNode)) {
      return;
    }

    for (const child of node.elems) {
      lineToNode.set(child.location.start.line, child);

      if (
        (child instanceof CallNode ||
          child instanceof ForInNode ||
          child instanceof ForNode ||
          child instanceof WhileNode ||
          child instanceof RepeatNode) &&
        child.body
      ) {
        visit(child.body);
      } else if (child instanceof IfNode) {
        visit(child.thenBody);
        if (child.elseBody) {
          visit(child.elseBody);
        }
      }
    }
  }

  function isMarkable(lineNumber: number): boolean {
    return lineToNode.has(lineNumber);
  }

  function markableLines(): readonly number[] {
    return [...lineToNode.keys()];
  }

  function mapMarkers(getMarker: MarkerLineLookup): MarkerMap {
    return (node) => {
      if (lineToNode.get(node.location.start.line) !== node) {
        return undefined;
      }
      return getMarker(node.location.start.line);
    };
  }

  for (const fn of Object.values(program.functions)) {
    visit(fn.body);
  }
  visit(program.main);

  return {
    isMarkable,
    markableLines,
    mapMarkers,
  };
}

export function mapMarkers(program: Program, markers: readonly MarkerType[]) {
  return buildMarkerLineMap(program).mapMarkers(
    (lineNumber) => markers[lineNumber]
  );
}
