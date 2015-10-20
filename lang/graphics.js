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
  key: null, // identifier for lookup
  type: null, // rect, circle, ellipse, etc.
  transform: null, // transformation matrix
  origin: immutable.List([ 0, 0 ]), // origin for transforms
  attrs: immutable.Map() // svg attrs for this element
});

function createMatrix() {
  return $('#display svg')[0].createSVGMatrix();
}

export class SGRuntime extends SRuntime {
  constructor() {
    super();
    this.setMode('split');
  }

  setMode(mode) {
    this.mode = mode;

    switch (mode) {
      case 'text':
        this.buf = immutable.List();
        this.gfx = null;
      case 'graphics':
        this.buf = null;
        this.gfx = immutable.OrderedMap();
        break;
      case 'split':
        this.buf = immutable.List();
        this.gfx = immutable.OrderedMap();
        break;
    }

    this.updateDisplay();
  }

  addShape(data) {
    let rnd = Math.floor(Math.random() * (2 << 23)),
        key = ('000000' + rnd.toString(16)).substr(-6);

    let shape = new Shape({
      key: key,
      type: data.type,
      attrs: immutable.Map(data.attrs)
    });

    this.gfx = this.gfx.set(key, shape);
    return shape;
  }

  updateShape(shape, name, value) {
    // retrieve current shape data, might have been modified elsewhere
    shape = this.gfx.get(shape.key);

    // update the supplied attribute
    shape = shape.set('attrs', shape.attrs.set(name, value));
    this.gfx = this.gfx.set(shape.key, shape);
    return shape;
  }

  transformShape(shape, xform) {
    // retrieve current shape data, might have been modified elsewhere
    shape = this.gfx.get(shape.key);

    let mat = createMatrix(), trans = shape.transform;

    if (trans) {
      mat.a = trans.get(0);
      mat.b = trans.get(1);
      mat.c = trans.get(2);
      mat.d = trans.get(3);
      mat.e = trans.get(4);
      mat.f = trans.get(5);
    }

    // call the supplied transformer
    mat = xform(mat);

    // update the transform
    trans = immutable.List([ mat.a, mat.b, mat.c, mat.d, mat.e, mat.f ]);
    shape = shape.set('transform', trans);
    this.gfx = this.gfx.set(shape.key, shape);
    return shape;
  }

  updateDisplay() {
    if (!$('#display').hasClass(`mode-${this.mode}`)) {
      $('#display').removeClass('mode-graphics')
                   .removeClass('mode-text')
                   .removeClass('mode-mixed')
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

SGRuntime.globals = {
  __proto__: SRuntime.globals,

  print(...values) {
    if (values.length > 0) {
      for (let v of values) {
        this.buf = this.buf.push(handle(v).repr(v));
      }
    } else {
      this.buf = this.buf.push('');
    }
    this.updateDisplay();
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
    return this.addShape({
      type: 'rect',
      attrs: { x, y, width, height }
    });
  },

  circle(cx, cy, r) {
    return this.addShape({
      type: 'circle',
      attrs: { cx, cy, r }
    });
  },

  ellipse(cx, cy, rx, ry) {
    return this.addShape({
      type: 'ellipse',
      attrs: { cx, cy, rx, ry }
    });
  },

  line(x1, y1, x2, y2) {
    return this.addShape({
      type: 'line',
      attrs: { x1, y1, x2, y2 }
    });
  },

  polyline(...points) {
    return this.addShape({
      type: 'polyline',
      attrs: { points: points.join(',') }
    });
  },

  polygon(...points) {
    return this.addShape({
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
      return { [assignKey]: [ this.updateShape(sh, 'fill', color || 'none') ] };
    },

    stroke(sh, color) {
      return { [assignKey]: [ this.updateShape(sh, 'stroke', color || 'none') ] };
    },

    opacity(sh, value = 1) {
      return { [assignKey]: [ this.updateShape(sh, 'opacity', value) ] };
    },

    translate(sh, tx = 0, ty = 0) {
      return { [assignKey]: [ this.transformShape(sh, (mat) => mat.translate(tx, ty)) ] };
    },

    scale(sh, s) {
      return { [assignKey]: [ this.transformShape(sh, (mat) => mat.scale(s)) ] };
    },

    scalex(sh, sx) {
      return { [assignKey]: [ this.transformShape(sh, (mat) => mat.scaleNonUniform(sx, 1)) ] };
    },

    scaley(sh, sy) {
      return { [assignKey]: [ this.transformShape(sh, (mat) => mat.scaleNonUniform(1, sy)) ] };
    },

    flipx(sh) {
      return { [assignKey]: [ this.transformShape(sh, (mat) => mat.flipX()) ] };
    },

    flipy(sh) {
      return { [assignKey]: [ this.transformShape(sh, (mat) => mat.flipY()) ] };
    },

    skewx(sh, ax) {
      return { [assignKey]: [ this.transformShape(sh, (mat) => mat.skewX(ax)) ] };
    },

    skewy(sh, ay) {
      return { [assignKey]: [ this.transformShape(sh, (mat) => mat.skewY(ay)) ] };
    },

    rotate(sh, a = 0, cx = 0, cy = 0) {
      let xform = cx == 0 && cy == 0 ?
                    (mat) => mat.rotate(a) :
                    (mat) => mat.translate(cx, cy)
                              .rotate(a)
                              .translate(-cx, -cy);

      return { [assignKey]: [ this.transformShape(sh, xform) ] };
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

    move(sh, x, y) {
      sh = this.updateShape(sh, 'x', x);
      sh = this.updateShape(sh, 'y', y);
      return { [assignKey]: [ sh ] };
    }
  }
};

export const SCircle = {
  __proto__: SShape,

  methods: {
    __proto__: SShape.methods,

    move(sh, cx, cy) {
      sh = this.updateShape(sh, 'cx', cx);
      sh = this.updateShape(sh, 'cy', cy);
      return { [assignKey]: [ sh ] };
    }
  }
};

export const SEllipse = {
  __proto__: SShape,

  methods: {
    __proto__: SShape.methods,

    move(sh, cx, cy) {
      sh = this.updateShape(sh, 'cx', cx);
      sh = this.updateShape(sh, 'cy', cy);
      return { [assignKey]: [ sh ] };
    }
  }
};

export const SLine = {
  __proto__: SShape,

  methods: {
    __proto__: SShape.methods,

    move(sh, x, y) {
      sh = this.updateShape(sh, 'x', x);
      sh = this.updateShape(sh, 'y', y);
      return { [assignKey]: [ sh ] };
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

export function createRuntime() {
  return new SGRuntime();
}
