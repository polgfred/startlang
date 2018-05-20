import React, { Component } from 'react';

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

export default class Graphics extends Component {
  shouldComponentUpdate(nextProps) {
    return this.props.data.shapes != nextProps.data.shapes;
  }

  render() {
    let { data: { shapes } } = this.props, elems = [];

    // make sure the list hasn't been modified from the front
    if (shapes._origin != 0) {
      throw new Error('shape list has been modified from the front');
    }
    if (shapes._root) {
      elems.push(<Group key={0} node={shapes._root} level={shapes._level} />);
    }
    if (shapes._tail) {
      elems.push(<Group key={1} node={shapes._tail} level={0} />);
    }

    return <svg className="start-graphics">
      <g className="start-orient">{ elems }</g>
    </svg>;
  }
}

class Group extends Component {
  shouldComponentUpdate(nextProps) {
    return this.props.node != nextProps.node;
  }

  render() {
    let { node: { array }, level } = this.props, elems = [];

    if (level == 0) {
      for (let i = 0; i < array.length; ++i) {
        elems.push(React.createElement(registry[array[i].type], {
          key: i,
          shape: array[i]
        }));
      }
    } else {
      for (let i = 0; i < array.length; ++i) {
        elems.push(<Group key={i} node={array[i]} level={level - LIST_SHIFT} />);
      }
    }

    return <g>{ elems }</g>;
  }
}

class Shape extends Component {
  shouldComponentUpdate(nextProps) {
    return this.props.shape != nextProps.shape;
  }

  setup() {
    let { shape: { sprops } } = this.props, attrs = { style: {} }, trans = '';

    if (sprops.stroke) {
      attrs.style.stroke = sprops.stroke;
    }
    if (sprops.fill) {
      attrs.style.fill = sprops.fill;
    }
    if (sprops.opacity && sprops.opacity < 1) {
      attrs.style.opacity = sprops.opacity;
    }
    if (sprops.rotate != 0) {
      trans += `rotate(${sprops.rotate}deg)`;
    }
    if (sprops.scalex != 1 || sprops.scaley != 1) {
      trans += `scale(${sprops.scalex},${sprops.scaley})`;
    }
    if (trans) {
      attrs.style.transform = trans;
      attrs.style.transformOrigin = sprops.anchor;
    }

    return attrs;
  }
}

class Rect extends Shape {
  render() {
    let { shape } = this.props, attrs = this.setup();

    attrs.x = shape.x;
    attrs.y = shape.y;
    attrs.width = shape.width;
    attrs.height = shape.height;

    return <rect {...attrs} />;
  }
}

class Circle extends Shape {
  render() {
    let { shape } = this.props, attrs = this.setup();

    attrs.cx = shape.cx;
    attrs.cy = shape.cy;
    attrs.r = shape.r;

    return <circle {...attrs} />;
  }
}

class Ellipse extends Shape {
  render() {
    let { shape } = this.props, attrs = this.setup();

    attrs.cx = shape.cx;
    attrs.cy = shape.cy;
    attrs.rx = shape.rx;
    attrs.ry = shape.ry;

    return <ellipse {...attrs} />;
  }
}

class Line extends Shape {
  render() {
    let { shape } = this.props, attrs = this.setup();

    attrs.x1 = shape.x1;
    attrs.y1 = shape.y1;
    attrs.x2 = shape.x2;
    attrs.y2 = shape.y2;

    return <line {...attrs} />;
  }
}

class Polygon extends Shape {
  render() {
    let { shape } = this.props, attrs = this.setup();

    attrs.points = shape.points.join(',');

    return <polygon {...attrs} />;
  }
}

class Text extends Shape {
  render() {
    let { shape } = this.props, attrs = this.setup();

    attrs.x = shape.x;
    attrs.y = shape.y;
    attrs.textAnchor = shape.tprops.align;
    attrs.style.fontFamily = shape.tprops.fface;
    attrs.style.fontSize = shape.tprops.fsize;

    return <text {...attrs}>{ shape.text }</text>;
  }
}

const registry = {
  'rect': Rect,
  'circle': Circle,
  'ellipse': Ellipse,
  'line': Line,
  'polygon': Polygon,
  'text': Text
};
