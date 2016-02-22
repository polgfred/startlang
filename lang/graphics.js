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
    this.gfx = new SGraphics();
    this.setMode('text');
  }

  setMode(mode) {
    this.mode = mode;
    this.updateDisplay();
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

  reset() {
    this.buf = immutable.List();
    this.gfx = this.gfx.set('shapes', immutable.List());
  },

  clear() {
    SGRuntime.globals.reset.call(this);
    return SGRuntime.globals.repaint.call(this);
  },

  display(mode) {
    this.setMode(mode);
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

  fill(color) {
    this.gfx = this.gfx.update('props', (props) => props.set('fill', color));
  },

  stroke(color) {
    this.gfx = this.gfx.update('props', (props) => props.set('stroke', color));
  },

  alpha(opacity = 1) {
    this.gfx = this.gfx.update('props', (props) => props.set('alpha', opacity));
  },

  rotate(angle = 0) {
    this.gfx = this.gfx.update('props', (props) => props.set('angle', angle));
  },

  scale(scalex = 1, scaley = scalex) {
    this.gfx = this.gfx.update('props', (props) => props
      .set('scalex', scalex)
      .set('scaley', scaley));
  },

  rect(x, y, width, height) {
    this.gfx = this.gfx.addShape(Rect({ x, y, width, height }));
  },

  circle(cx, cy, r) {
    this.gfx = this.gfx.addShape(Circle({ cx, cy, r }));
  },

  ellipse(cx, cy, rx, ry) {
    this.gfx = this.gfx.addShape(Ellipse({ cx, cy, rx, ry }));
  }

  // text(x, y, text, fontSize = 16) {
  //   return this.addShape({
  //     type: 'text', x, y, text, attrs: { fontSize }
  //   });
  // },
  //
  // line(x1, y1, x2, y2) {
  //   return this.addShape({
  //     type: 'line', x: x1, y: y1, attrs: {
  //       x1: 0,
  //       y1: 0,
  //       x2: x2 - x1,
  //       y2: y2 - y1
  //     }
  //   });
  // },
  //
  // polyline(x, y, ...points) {
  //   return this.addShape({
  //     type: 'polyline', x, y, attrs: { points: points.join(',') }
  //   });
  // },
  //
  // polygon(x, y, ...points) {
  //   return this.addShape({
  //     type: 'polygon', x, y, attrs: { points: points.join(',') }
  //   });
  // }
}, SRuntime.globals);

// properties common to all shapes
const shapeProps = {
  stroke: null,
  fill: null,
  alpha: null,
  align: 'center',
  angle: 0,
  scalex: 1,
  scaley: 1
};

let shapeKeys = Object.keys(shapeProps);

export class SGraphics extends immutable.Record({
  props: immutable.Map(shapeProps),
  shapes: immutable.List()
}) {
  addShape(sh) {
    return this.update('shapes', (shapes) => shapes.push(sh.merge(this.props)));
  }
}

const Rect = immutable.Record(extendObject({
  type: 'rect',
  x: 0,
  y: 0,
  width: 0,
  height: 0
}, shapeProps));

const Circle = immutable.Record(extendObject({
  type: 'circle',
  cx: 0,
  cy: 0,
  r: 0
}, shapeProps));

const Ellipse = immutable.Record(extendObject({
  type: 'ellipse',
  cx: 0,
  cy: 0,
  rx: 0,
  ry: 0
}, shapeProps));

export function createRuntime() {
  return new SGRuntime;
}
