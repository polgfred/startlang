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

    let { shapes: list } = this.props.data,
        shapes = [];

    if (list._root) {
      shapes.push(React.createElement(CGroup, {
        key: 0,
        node: list._root,
        level: list._level
      }));
    }
    if (list._tail) {
      shapes.push(React.createElement(CGroup, {
        key: 1,
        node: list._tail,
        level: 0
      }));
    }

    return React.createElement('svg', null, shapes);
  }
}

class CGroup extends CBase {
  shouldComponentUpdate(nextProps) {
    return this.props.node != nextProps.node;
  }

  render() {
    let { node, level } = this.props,
        array = node.array,
        shapes = [],
        i;

    if (level == 0) {
      for (i = 0; i < array.length; ++i) {
        shapes.push(React.createElement(registry[array[i].type], {
          key: i,
          shape: array[i]
        }));
      }
    } else {
      for (i = 0; i < array.length; ++i) {
        shapes.push(React.createElement(CGroup, {
          key: i,
          node: array[i],
          level: level - 5
        }));
      }
    }

    return React.createElement('g', null, shapes);
  }
}

class CShape extends CBase {
  shouldComponentUpdate(nextProps) {
    return this.props.shape != nextProps.shape;
  }

  setup() {
    let { shape } = this.props,
        props = shape.props,
        attrs = { style: {} },
        trans = '';

    if (props.stroke) {
      attrs.style.stroke = props.stroke;
    }
    if (props.fill) {
      attrs.style.fill = props.fill;
    }
    if (props.opacity && props.opacity < 1) {
      attrs.style.opacity = props.opacity;
    }
    if (props.rotate != 0) {
      trans += `rotate(${props.rotate}deg)`;
    }
    if (props.scalex != 1 || props.scaley != 1) {
      trans += `scale(${props.scalex},${props.scaley})`;
    }
    if (trans) {
      attrs.style.transform = trans;
      attrs.style.transformOrigin = props.origin;
    }

    return attrs;
  }
}

class CRect extends CShape {
  render() {
    let shape = this.props.shape,
        attrs = this.setup();

    attrs.x = shape.x;
    attrs.y = shape.y;
    attrs.width = shape.width;
    attrs.height = shape.height;

    return React.createElement('rect', attrs);
  }
}

class CCircle extends CShape {
  render() {
    let shape = this.props.shape,
        attrs = this.setup();

    attrs.cx = shape.cx;
    attrs.cy = shape.cy;
    attrs.r = shape.r;

    return React.createElement('circle', attrs);
  }
}

class CEllipse extends CShape {
  render() {
    let shape = this.props.shape,
        attrs = this.setup();

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
