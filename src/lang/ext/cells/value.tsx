import { Cell } from './base.jsx';

export class ValueCell extends Cell {
  constructor(private readonly value: string) {
    super();
  }

  getHTMLElement() {
    return <span>{this.value}</span>;
  }
}
