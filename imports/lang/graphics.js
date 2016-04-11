'use strict';

import React from 'react';
import ReactDOM from 'react-dom';
import immutable from 'immutable';

import { SRuntime, SBase, handle, handlerKey, assignKey, resultKey } from './runtime';

export class SGRuntime extends SRuntime {
  constructor(app) {
    super();

    // the react component that we'll call methods on
    this.app = app;
  }
}

SGRuntime.globals = Object.setPrototypeOf({
  repaint() {
    // let the DOM catch up
    return new Promise((resolve) => {
      Meteor.defer(resolve);
    });
  },

  clear() {
    this.app.gfxUpdate((gfx) => gfx.set('shapes', immutable.List()));
    this.app.termUpdate((buf) => buf.clear());
  },

  print(...values) {
    if (values.length > 0) {
      for (let i = 0; i < values.length; ++i) {
        let v = values[i];
        this.app.termUpdate((buf) => buf.push(handle(v).repr(v)));
      }
    } else {
      this.app.termUpdate((buf) => buf.push(''));
    }
  },

  input(prompt) {
    return new Promise((resolve) => {
      this.app.termInput(prompt, (input) => {
        resolve(input);
      });
    });
  },

  // shape creation

  rect(x, y, width, height) {
    this.app.gfxUpdate((gfx) => gfx.addShape(Rect, { x, y, width, height }));
  },

  circle(cx, cy, r) {
    this.app.gfxUpdate((gfx) => gfx.addShape(Circle, { cx, cy, r }));
  },

  ellipse(cx, cy, rx, ry) {
    this.app.gfxUpdate((gfx) => gfx.addShape(Ellipse, { cx, cy, rx, ry }));
  },

  line(x1, y1, x2, y2) {
    this.app.gfxUpdate((gfx) => gfx.addShape(Line, { x1, y1, x2, y2 }));
  },

  polygon(...points) {
    points = immutable.List.isList(points[0]) ?
      points[0] :
      immutable.List(points);
    this.app.gfxUpdate((gfx) => gfx.addShape(Polygon, { points }));
  },

  text(x, y, text) {
    this.app.gfxUpdate((gfx) => gfx.addShape(Text, { x, y, text }));
  },

  // set shape and text attributes

  color(r, g, b) {
    let hex = (v) => ('0' + Math.round(255 * v).toString(16)).substr(-2);
    return `#${hex(r)}${hex(g)}${hex(b)}`;
  },

  fill(color) {
    this.app.gfxUpdate((gfx) => gfx
      .updateSprops((sprops) => sprops
        .set('fill', color)));
  },

  stroke(color) {
    this.app.gfxUpdate((gfx) => gfx
      .updateSprops((sprops) => sprops
        .set('stroke', color)));
  },

  opacity(value = 1) {
    this.app.gfxUpdate((gfx) => gfx
      .updateSprops((sprops) => sprops
        .set('opacity', value)));
  },

  anchor(value = 'center') {
    this.app.gfxUpdate((gfx) => gfx
      .updateSprops((sprops) => sprops
        .set('anchor', value)));
  },

  rotate(angle = 0) {
    this.app.gfxUpdate((gfx) => gfx
      .updateSprops((sprops) => sprops
        .set('rotate', angle)));
  },

  scale(scalex = 1, scaley = scalex) {
    this.app.gfxUpdate((gfx) => gfx
      .updateSprops((sprops) => sprops
        .set('scalex', scalex)
        .set('scaley', scaley)));
  },

  align(value = 'start') {
    this.app.gfxUpdate((gfx) => gfx
      .updateSprops((sprops) => sprops
        .set('align', value)));
  },

  font(fface = 'Helvetica', fsize = 32) {
    this.app.gfxUpdate((gfx) => gfx
      .updateTprops((tprops) => tprops
        .set('fface', fface)
        .set('fsize', fsize)));
  }
}, SRuntime.globals);

// visual properties that will get applied to shapes
const SShapeProps = immutable.Record({
  stroke: null,
  fill: null,
  opacity: null,
  anchor: 'center',
  rotate: 0,
  scalex: 1,
  scaley: 1
});

// visual properties that will get applied to text
const STextProps = immutable.Record({
  fface: 'Helvetica',
  fsize: 32,
  align: 'start'
});

export class SGraphics extends immutable.Record({
  shapes: immutable.List(),
  sprops: SShapeProps(),
  tprops: STextProps()
}) {
  addShape(rec, attrs) {
    // set the current graphics props on the shape
    attrs.sprops = this.sprops;
    attrs.tprops = this.tprops;
    return this.update('shapes', (shapes) => shapes.push(rec(attrs)));
  }

  removeShapes(num) {
    return this.update('shapes', (shapes) => shapes.skipLast(num));
  }

  updateSprops(mut) {
    return this.update('sprops', (sprops) => mut(sprops));
  }

  updateTprops(mut) {
    return this.update('tprops', (tprops) => mut(tprops));
  }
}

const Rect = immutable.Record({
  type: 'rect',
  x: 0,
  y: 0,
  width: 0,
  height: 0,
  sprops: SShapeProps()
});

const Circle = immutable.Record({
  type: 'circle',
  cx: 0,
  cy: 0,
  r: 0,
  sprops: SShapeProps()
});

const Ellipse = immutable.Record({
  type: 'ellipse',
  cx: 0,
  cy: 0,
  rx: 0,
  ry: 0,
  sprops: SShapeProps()
});

const Line = immutable.Record({
  type: 'line',
  x1: 0,
  y1: 0,
  x2: 0,
  y2: 0,
  sprops: SShapeProps()
});

const Polygon = immutable.Record({
  type: 'polygon',
  points: immutable.List(),
  sprops: SShapeProps()
});

const Text = immutable.Record({
  type: 'text',
  x: 0,
  y: 0,
  text: '',
  sprops: SShapeProps(),
  tprops: STextProps()
});
