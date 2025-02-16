import { immerable } from 'immer';
import { JSX, memo } from 'react';

export abstract class Cell {
  static [immerable] = true;

  abstract getHTMLElement(): JSX.Element;

  addChild(child: Cell): Cell {
    throw new Error('invalid operation');
  }
}

class RootCell extends Cell {
  getHTMLElement() {
    // this is a sentinel cell that doesn't render anything
    return <></>;
  }
}

export const rootCell = new RootCell();

export const CellElement = memo(function CellElement({ cell }: { cell: Cell }) {
  return cell.getHTMLElement();
});
