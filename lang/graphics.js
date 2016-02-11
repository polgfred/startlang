'use strict';

import { _extend as extendObject } from 'util';

import $ from 'jquery';
import React from 'react';
import ReactDOM from 'react-dom';
import immutable from 'immutable';

import { SRuntime, SBase, handle, handlerKey, assignKey, resultKey } from './runtime';
import CGraphics from '../comp/graphics';
import CTerm from '../comp/term';

export class SGRuntime extends SRuntime {
  constructor() {
    super();
    this.buf = immutable.List();
    this.gfx = immutable.OrderedMap();
    this.setMode('text');
  }

  setMode(mode) {
    this.mode = mode;
    this.updateDisplay();
  }

  addShape(shape) {
    let rnd = Math.floor(Math.random() * (2 << 23)),
        key = ('000000' + rnd.toString(16)).substr(-6);

    shape = shape.set('key', key);
    this.gfx = this.gfx.set(key, shape);
    return shape;
  }

  updateShape(key, shape) {
    // retrieve current shape data and update it
    this.gfx = this.gfx.set(key, shape);
    return shape;
  }

  updateDisplay() {
    if (!$('#display').hasClass(`mode-${this.mode}`)) {
      $('#display').removeClass('mode-graphics')
                   .removeClass('mode-text')
                   .removeClass('mode-split')
                   .addClass(`mode-${this.mode}`);
    }

    if (this.buf) {
      this.rterm = ReactDOM.render(<CTerm buf={this.buf} />, $('#display .text')[0]);
    }

    if (this.gfx) {
      this.rgfx = ReactDOM.render(<CGraphics data={this.gfx} />, $('#display .graphics')[0]);
    }
  }
}

SGRuntime.globals = Object.setPrototypeOf({
  refresh() {
    // let the DOM catch up
    return new Promise((resolve) => {
      setImmediate(resolve);
    });
  },

  repaint() {
    // render pending changes to DOM and refresh
    this.updateDisplay();
    return SGRuntime.globals.refresh.call(this);
  },

  display(mode) {
    this.setMode(mode);
  },

  clear() {
    this.buf = immutable.List();
    this.gfx = immutable.OrderedMap();
    return SGRuntime.globals.repaint.call(this);
  },

  print(...values) {
    if (values.length > 0) {
      for (let v of values) {
        this.buf = this.buf.push(handle(v).repr(v));
      }
    } else {
      this.buf = this.buf.push('');
    }
    return SGRuntime.globals.repaint.call(this);
  },

  input(prompt) {
    return new Promise((resolve) => {
      this.rterm.getInput(prompt, (input) => {
        this.buf = this.buf.push(`${prompt}${input}`);
        this.updateDisplay();
        resolve(input);
      });
    });
  },

  rgb(r, g, b) {
    let hex = (v) => ('0' + Math.round(255 * v).toString(16)).substr(-2);
    return `#${hex(r)}${hex(g)}${hex(b)}`;
  },

  rect(x, y, width, height) {
    return this.addShape(Rect({ x, y, width, height }));
  },

  circle(cx, cy, r) {
    return this.addShape(Circle({ cx, cy, r }));
  },

  ellipse(cx, cy, rx, ry) {
    return this.addShape(Ellipse({ cx, cy, rx, ry }));
  },

  text(x, y, text, fontSize = 16) {
    return this.addShape({
      type: 'text', x, y, text, attrs: { fontSize }
    });
  },

  line(x1, y1, x2, y2) {
    return this.addShape({
      type: 'line', x: x1, y: y1, attrs: {
        x1: 0,
        y1: 0,
        x2: x2 - x1,
        y2: y2 - y1
      }
    });
  },

  polyline(x, y, ...points) {
    return this.addShape({
      type: 'polyline', x, y, attrs: { points: points.join(',') }
    });
  },

  polygon(x, y, ...points) {
    return this.addShape({
      type: 'polygon', x, y, attrs: { points: points.join(',') }
    });
  }
}, SRuntime.globals);

// properties common to all shapes
const baseProps = {
  key: null,
  stroke: null,
  fill: null,
  alpha: null,
  align: 'center',
  angle: 0,
  scalex: 1,
  scaley: 1
};

const Rect = immutable.Record(extendObject({
  type: 'rect',
  x: 0,
  y: 0,
  width: 0,
  height: 0
}, baseProps));

const Circle = immutable.Record(extendObject({
  type: 'circle',
  cx: 0,
  cy: 0,
  r: 0
}, baseProps));

const Ellipse = immutable.Record(extendObject({
  type: 'ellipse',
  cx: 0,
  cy: 0,
  rx: 0,
  ry: 0
}, baseProps));

// handlers for shapes
const SShape = Object.setPrototypeOf({
  repr(sh) {
    return `*${sh.type}*`;
  },

  getindex(sh, index) {
    return sh.get(index);
  },

  setindex(sh, index, value) {
    return this.updateShape(sh.key, sh.set(index, value));
  },

  methods: {
    clone(sh) {
    },

    remove(sh) {
    }
  }
}, SBase);

const SRect = Object.setPrototypeOf({
  methods: Object.setPrototypeOf({
    move(sh, x, y) {
      return {
        [assignKey]: this.updateShape(sh.key, sh.set('x', x).set('y', y))
      };
    }
  }, SShape.methods)
}, SShape);

Rect.prototype[handlerKey] = SRect;

const SCircle = Object.setPrototypeOf({
  methods: Object.setPrototypeOf({
    move(sh, cx, cy) {
      return {
        [assignKey]: this.updateShape(sh.key, sh.set('cx', cx).set('cy', cy))
      };
    }
  }, SShape.methods)
}, SShape);

Circle.prototype[handlerKey] = SCircle;

const SEllipse = Object.setPrototypeOf({
  methods: Object.setPrototypeOf({
    move(sh, cx, cy) {
      return {
        [assignKey]: this.updateShape(sh.key, sh.set('cx', cx).set('cy', cy))
      };
    }
  }, SShape.methods)
}, SShape);

Ellipse.prototype[handlerKey] = SEllipse;

const SLine = Object.setPrototypeOf({
  methods: Object.setPrototypeOf({
  }, SShape.methods)
}, SShape);

// used for both polylines and polygons, as it just moves points
const SPolygon = Object.setPrototypeOf({
  methods: Object.setPrototypeOf({
  }, SShape.methods)
}, SShape);

export function createRuntime() {
  return new SGRuntime;
}
