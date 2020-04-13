import Node from '../node';

import Chapter1 from './chapter1';
import Chapter2 from './chapter2';
import Chapter3 from './chapter3';
import Introduction from './introduction';

export default class Welcome extends Node {
  static get defaultProps() {
    return {
      level: 0,
      title: 'Welcome',
    };
  }

  static children() {
    return [Introduction, Chapter1, Chapter2, Chapter3];
  }
}
