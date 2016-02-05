'use strict';

import $ from 'jquery';
import React from 'react';
import ReactDOM from 'react-dom';
import immutable from 'immutable';

import { SRuntime, SBase, handle, handlerKey, assignKey, resultKey } from './runtime';
import RGraphics from '../comp/graphics';
import RTerm from '../comp/term';

// immutable record type for shape data
export const Shape = immutable.Record({
  key: null,              // identifier for lookup
  type: null,             // rect, circle, ellipse, etc.
  x: 0,                   // location of shape on x axis
  y: 0,                   // location of shape on y axis
  angle: 0,               // rotation in coordinate space
  scalex: 1,              // scale factor for x
  scaley: 1,              // scale factor for y
  attrs: immutable.Map()  // svg attrs for this element
});

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

  addShape(data) {
    let rnd = Math.floor(Math.random() * (2 << 23)),
        key = ('000000' + rnd.toString(16)).substr(-6);

    let shape = new Shape({
      key: key,
      type: data.type,
      x: data.x,
      y: data.y,
      attrs: immutable.Map(data.attrs)
    });

    this.gfx = this.gfx.set(key, shape);
    return shape;
  }

  updateShape(key, xform) {
    // retrieve current shape data and update it
    let shape = xform(this.gfx.get(key));
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
      this.rterm = ReactDOM.render(<RTerm buf={this.buf} />, $('#display .text')[0]);
    }

    if (this.gfx) {
      this.rgfx = ReactDOM.render(<RGraphics data={this.gfx} />, $('#display .graphics')[0]);
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
    return this.addShape({
      type: 'rect', x, y, attrs: { width, height }
    });
  },

  crect(x, y, width, height) {
    // a rect, but shifted so that its x, y is in the center
    return this.addShape({
      type: 'rect', x, y, attrs: { x: -width / 2, y: -height / 2, width, height }
    });
  },

  circle(x, y, r) {
    return this.addShape({
      type: 'circle', x, y, attrs: { r }
    });
  },

  ellipse(x, y, rx, ry) {
    return this.addShape({
      type: 'ellipse', x, y, attrs: { rx, ry }
    });
  },

  line(x, y, x2, y2) {
    return this.addShape({
      type: 'line', x, y, attrs: { x2: x2 - x, y2: y2 - y }
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

// all shapes have these basic utilities in common
export const SShape = Object.setPrototypeOf({
  repr(sh) {
    return `*${sh.type}*`;
  },

  methods: {
    move(sh, x, y) {
      return {
        [assignKey]:
          this.updateShape(sh.key, (sh) => sh
            .set('x', x)
            .set('y', y))
      };
    },

    fill(sh, color) {
      return {
        [assignKey]:
          this.updateShape(sh.key, (sh) => sh
            .set('attrs', sh.attrs
              .set('fill', color || 'none')))
      };
    },

    draw(sh, color) {
      return {
        [assignKey]:
          this.updateShape(sh.key, (sh) => sh
            .set('attrs', sh.attrs
              .set('stroke', color || 'none')))
      };
    },

    alpha(sh, value = 1) {
      return {
        [assignKey]:
          this.updateShape(sh.key, (sh) => sh
            .set('attrs', sh.attrs
              .set('opacity', value)))
      };
    },

    scale(sh, sx = 1, sy = sx) {
      return {
        [assignKey]:
          this.updateShape(sh.key, (sh) => sh
            .set('scalex', sx)
            .set('scaley', sy))
      };
    },

    flipx(sh) {
      return {
        [assignKey]:
          this.updateShape(sh.key, (sh) => sh
            .set('scalex', -sh.scalex))
      };
    },

    flipy(sh) {
      return {
        [assignKey]:
          this.updateShape(sh.key, (sh) => sh
            .set('scaley', -sh.scaley))
      };
    },

    rotate(sh, a = 0) {
      return {
        [assignKey]:
          this.updateShape(sh.key, (sh) => sh
            .set('angle', a))
      };
    },

    clone(sh) {
    },

    remove(sh) {
    }
  }
}, SBase);

export const SRect = Object.setPrototypeOf({
  methods: Object.setPrototypeOf({
  }, SShape.methods)
}, SShape);

export const SEllipse = Object.setPrototypeOf({
  methods: Object.setPrototypeOf({
  }, SShape.methods)
}, SShape);

export const SLine = Object.setPrototypeOf({
  methods: Object.setPrototypeOf({
  }, SShape.methods)
}, SShape);

// used for both polylines and polygons, as it just moves points
export const SPolygon = Object.setPrototypeOf({
  methods: Object.setPrototypeOf({
  }, SShape.methods)
}, SShape);

let handlerMap = {
  rect: SRect,
  circle: SEllipse,
  ellipse: SEllipse,
  line: SLine,
  polyline: SPolygon,
  polygon: SPolygon
};

Shape.prototype[handlerKey] = (obj) => handlerMap[obj.type];

export function createRuntime() {
  return new SGRuntime;
}
