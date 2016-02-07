'use strict';

import React from 'react';

import CBase from './base';

export default class CGraphics extends CBase {
  render() {
    // TODO: allow for different coordinate systems
    // let dims = $('svg')[0].getBoundingClientRect(),
    //     originx = Math.floor(dims.width / 2),
    //     originy = Math.floor(dims.height / 2);
    //<g transform={`translate(${originx} ${originy}) scale(1 -1)`}>

    let shapes = this.props.data.valueSeq().map((shape) => {
      let comp = registry[shape.type];
      return React.createElement(comp, { key: shape.key, shape: shape });
    });

    return <svg>
      <g>{shapes}</g>
    </svg>;
  }
}

export class CShape extends CBase {
  shouldComponentUpdate(nextProps) {
    return this.props.shape != nextProps.shape;
  }
}

export class CRect extends CBase {
  render() {
    let shape = this.props.shape, attrs = { style: {} };

    attrs.x = shape.x;
    attrs.y = shape.y;
    attrs.width = shape.width;
    attrs.height = shape.height;

    if (shape.stroke) {
      attrs.stroke = shape.stroke;
    }

    if (shape.fill) {
      attrs.fill = shape.fill;
    }

    if (shape.alpha && shape.alpha < 1) {
      attrs.opacity = shape.alpha;
    }

    if (shape.align) {
      attrs.style.transformOrigin = shape.align;
    }

    if (shape.angle != 0 || shape.scalex != 1 && shape.scaley != 1) {
      let trans = '';

      if (shape.angle != 0) {
        trans += `rotate(${shape.angle}deg)`;
      }

      if (shape.scalex != 1 && shape.scaley != 1) {
        trans += `scale(${shape.scalex} ${shape.scaley})`;
      }

      attrs.style.transform = trans;
    }

    return React.createElement('rect', attrs);
  }
}

const registry = {
  'rect': CRect
};
