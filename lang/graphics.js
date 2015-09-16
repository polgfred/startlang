'use strict';

import $ from 'jquery';
import React from 'react';
import immutable from 'immutable';
import { SRuntime, SBase, handle, handlerKey } from './runtime';

const graphicsDisplay = document.getElementById('display');

// immutable record type for shape data
export const Shape = immutable.Record({
  key: null, // identifier for lookup
  type: null, // rect, circle, ellipse, etc.
  transform: null, // transformation matrix
  origin: immutable.List([ 0, 0 ]), // origin for transforms
  attrs: immutable.Map() // svg attrs for this element
});

export class SGRuntime extends SRuntime {
  constructor() {
    super();
    this.gfx = immutable.List();
    this.updateDisplay();
  }

  pushShape(data) {
    let rnd = Math.floor(Math.random() * (2 << 23)),
        key = ('000000' + rnd.toString(16)).substr(-6);

    let shape = new Shape({
      key: key,
      type: data.type,
      transform: data.transform,
      origin: immutable.List(data.origin || [ 0, 0 ]),
      attrs: immutable.Map(data.attrs)
    });

    this.gfx = this.gfx.push(shape);
    return shape;
  }

  updateShape(shape, attrs) {
    shape = shape.set('attrs', shape.attrs.withMutations((m) => {
      let keys = Object.keys(attrs);
      for (let i = 0; i < keys.length; ++i) {
        m.set(keys[i], attrs[keys[i]]);
      }
    }));

    // cache this lookup eventually
    let pos = this.gfx.findIndex((sh) => sh.key == shape.key);
    this.gfx = this.gfx.set(pos, shape);
  }

  updateDisplay() {
    React.render(<RGraphics data={this.gfx} />, graphicsDisplay);
  }
}

SGRuntime.globals = {
  __proto__: SRuntime.globals,

  print(...values) {
    if (values.length > 0) {
      for (let v of values) {
        console.log('[PRINT]', handle(v).repr(v));
        //termapi.echo(handle(v).repr(v));
      }
    } else {
      console.log('[PRINT]');
      //termapi.echo('');
    }
  },

  input(message) {
    return prompt(message);
  },

  clear() {
    console.clear();
    return SGRuntime.globals.repaint.call(this);
  },

  repaint() {
    // render to DOM and refresh
    this.updateDisplay();
    return SRuntime.globals.refresh.call(this);
  },

  rgb(r, g, b) {
    return '#' + ('0' + Math.round(255 * r).toString(16)).substr(-2) +
                 ('0' + Math.round(255 * g).toString(16)).substr(-2) +
                 ('0' + Math.round(255 * b).toString(16)).substr(-2);
  },

  rect(x, y, width, height) {
    return this.pushShape({
      type: 'rect',
      attrs: { x, y, width, height }
    });
  },

  circle(cx, cy, r) {
    return this.pushShape({
      type: 'circle',
      attrs: { cx, cy, r }
    });
  },

  ellipse(cx, cy, rx, ry) {
    return this.pushShape({
      type: 'ellipse',
      attrs: { cx, cy, rx, ry }
    });
  },

  line(x1, y1, x2, y2) {
    return this.pushShape({
      type: 'line',
      attrs: { x1, y1, x2, y2 }
    });
  },

  polyline(...points) {
    return this.pushShape({
      type: 'polyline',
      attrs: { points: points.join(',') }
    });
  },

  polygon(...points) {
    return this.pushShape({
      type: 'polygon',
      attrs: { points: points.join(',') }
    });
  }
};

// all shapes have these basic utilities in common
export const SShape = {
  __proto__: SBase,

  repr(sh) {
    return `*${sh.type}*`;
  },

  methods: {
    fill(sh, color) {
      this.updateShape(sh, { fill: color || 'none' });
    },

    stroke(sh, color) {
      this.updateShape(sh, { stroke: color || 'none' });
    },

    opacity(sh, value = 1) {
      this.updateShape(sh, { opacity: value });
    },

    rotate(sh, rot = 0) {
    },

    scale(sh, sx = 1, sy = sx) {
    },

    clone(sh) {
    },

    remove(sh) {
    }
  }
};

export const SRect = {
  __proto__: SShape,

  methods: {
    __proto__: SShape.methods,

    move(el, x, y) {
    }
  }
};

export const SCircle = {
  __proto__: SShape,

  methods: {
    __proto__: SShape.methods,

    move(el, x, y) {
    }
  }
};

export const SEllipse = {
  __proto__: SShape,

  methods: {
    __proto__: SShape.methods,

    move(el, x, y) {
    }
  }
};

export const SLine = {
  __proto__: SShape,

  methods: {
    __proto__: SShape.methods,

    move(el, x, y) {
    }
  }
};

// used for both polylines and polygons, as it just moves points
export const SPolygon = {
  __proto__: SShape,

  methods: {
    __proto__: SShape.methods,

    move(el, x, y) {
    }
  }
};

let handlerMap = {
  rect: SRect,
  circle: SCircle,
  ellipse: SEllipse,
  line: SLine,
  polyline: SPolygon,
  polygon: SPolygon
};

Shape.prototype[handlerKey] = (obj) => handlerMap[obj.type];

// react bindings

let RGraphics = React.createClass({
  render() {
    let originx = Math.floor($('svg').width() / 2),
        originy = Math.floor($('svg').height() / 2);

    let shapes = this.props.data.map((shape) => {
      return <RShape key={shape.key} shape={shape} />;
    });

    //<g transform={`translate(${originx} ${originy}) scale(1 -1)`}>
    return <svg id="canvas">
      <g>{shapes}</g>
    </svg>;
  }
});

let RShape = React.createClass({
  render() {
    let shape = this.props.shape;
    return React.createElement(shape.type, shape.attrs.toJS());
  },

  shouldComponentUpdate(nextProps) {
    return this.props.shape.attrs != nextProps.shape.attrs;
  }
});

export function createRuntime() {
  return new SGRuntime();
}
