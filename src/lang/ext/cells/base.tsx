import { immerable } from 'immer';
import { JSX } from 'react';

export abstract class Cell {
  static [immerable] = true;

  abstract getHTMLElement(): JSX.Element;

  addChild(child: Cell): Cell {
    throw new Error('invalid operation');
  }
}
