'use strict';

import React from 'react';

import CBase from './base';

// This React implementation depends on the internals of immutable.List
// (https://facebook.github.io/immutable-js/docs/#/List) to render the
// graphics display as a tree of svg nodes. The shapes are grouped into
// nested <g> elements per VNode of the list. Since most of the internal
// structure of the list never changes when items are added to the end,
// this enables React to refresh the graphics display in O(log32^n) time.

// For simplicity, this implementation assumes that the shape list has not
// had any items prepended to or removed from the front, as this adds
// additional complexity to the descent. But we check the list origin
// just in case.

// immutable.Lists use balanced trees of 32 (2^5) items, so this constant
// is the level shift we need to do when descending through nodes
const LIST_SHIFT = 5;

export default class CGraphics extends CBase {
  shouldComponentUpdate(nextProps) {
    return this.props.data != nextProps.data;
  }

  render() {
    // TODO: allow for different coordinate systems
    // let dims = $('svg')[0].getBoundingClientRect(),
    //     originx = Math.floor(dims.width / 2),
    //     originy = Math.floor(dims.height / 2);
    //<g transform={`translate(${originx} ${originy}) scale(1 -1)`}>

    let { shapes: list } = this.props.data,
        shapes = [];

    // make sure the list hasn't been modified from the front
    if (list._origin != 0) {
      throw new Error('shape list has been modified from the front');
    }
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
          level: level - LIST_SHIFT
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

class CLine extends CShape {
  render() {
    let shape = this.props.shape,
        attrs = this.setup();

    attrs.x1 = shape.x1;
    attrs.y1 = shape.y1;
    attrs.x2 = shape.x2;
    attrs.y2 = shape.y2;

    return React.createElement('line', attrs);
  }
}

class CPolygon extends CShape {
  render() {
    let shape = this.props.shape,
        attrs = this.setup();

    attrs.points = shape.points.join(',');

    return React.createElement('polygon', attrs);
  }
}

const registry = {
  'rect': CRect,
  'circle': CCircle,
  'ellipse': CEllipse,
  'line': CLine,
  'polygon': CPolygon
};
