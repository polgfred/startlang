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

    let shapes = [];
    this.props.data.shapes.forEach((shape, key) => {
      shapes.push(React.createElement(registry[shape.type], { key, shape }));
    });

    return <svg>
      <g>{shapes}</g>
    </svg>;
  }
}

class CShape extends CBase {
  shouldComponentUpdate(nextProps) {
    return this.props.shape != nextProps.shape;
  }

  setup() {
    let shape = this.props.shape, attrs = { style: {} }, trans = '';
    if (shape.stroke) {
      attrs.style.stroke = shape.stroke;
    }
    if (shape.fill) {
      attrs.style.fill = shape.fill;
    }
    if (shape.opacity && shape.opacity < 1) {
      attrs.style.opacity = shape.opacity;
    }
    if (shape.rotate != 0) {
      trans += `rotate(${shape.rotate}deg)`;
    }
    if (shape.scalex != 1 || shape.scaley != 1) {
      trans += `scale(${shape.scalex},${shape.scaley})`;
    }
    if (trans) {
      attrs.style.transform = trans;
      attrs.style.transformOrigin = shape.origin;
    }
    return attrs;
  }
}

class CRect extends CShape {
  render() {
    let shape = this.props.shape, attrs = this.setup();
    attrs.x = shape.x;
    attrs.y = shape.y;
    attrs.width = shape.width;
    attrs.height = shape.height;
    return React.createElement('rect', attrs);
  }
}

class CCircle extends CShape {
  render() {
    let shape = this.props.shape, attrs = this.setup();
    attrs.cx = shape.cx;
    attrs.cy = shape.cy;
    attrs.r = shape.r;
    return React.createElement('circle', attrs);
  }
}

class CEllipse extends CShape {
  render() {
    let shape = this.props.shape, attrs = this.setup();
    attrs.cx = shape.cx;
    attrs.cy = shape.cy;
    attrs.rx = shape.rx;
    attrs.ry = shape.ry;
    return React.createElement('ellipse', attrs);
  }
}

const registry = {
  'rect': CRect,
  'circle': CCircle,
  'ellipse': CEllipse
};
