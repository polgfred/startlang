'use strict';

import immutable from 'immutable';

import { SRuntime, SBase, handle, handlerKey, assignKey, resultKey } from './runtime';

export class SGRuntime extends SRuntime {
  addShape(type, attrs) {
    this.app.gfxUpdate((gfx) => gfx.addShape(type, attrs));
  }

  updateSprops(mut) {
    this.app.gfxUpdate((gfx) => gfx.updateSprops(mut));
  }

  updateTprops(mut) {
    this.app.gfxUpdate((gfx) => gfx.updateTprops(mut));
  }

  termOutput(line) {
    this.app.termUpdate((buf) => buf.push(line));
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
    this.app.clearDisplay();
  },

  print(...values) {
    if (values.length > 0) {
      for (let i = 0; i < values.length; ++i) {
        let v = values[i];
        this.termOutput(handle(v).repr(v));
      }
    } else {
      this.termOutput('');
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
    this.addShape(Rect, { x, y, width, height });
  },

  circle(cx, cy, r) {
    this.addShape(Circle, { cx, cy, r });
  },

  ellipse(cx, cy, rx, ry) {
    this.addShape(Ellipse, { cx, cy, rx, ry });
  },

  line(x1, y1, x2, y2) {
    this.addShape(Line, { x1, y1, x2, y2 });
  },

  text(x, y, text) {
    this.addShape(Text, { x, y, text });
  },

  polygon(...points) {
    points = immutable.List.isList(points[0]) ?
      points[0] :
      immutable.List(points);

    this.addShape(Polygon, { points });
  },

  // set shape and text attributes

  color(r, g, b) {
    let hex = (v) => ('0' + Math.round(255 * v).toString(16)).substr(-2);
    return `#${hex(r)}${hex(g)}${hex(b)}`;
  },

  fill(color) {
    this.updateSprops((sprops) => sprops.set('fill', color));
  },

  stroke(color) {
    this.updateSprops((sprops) => sprops.set('stroke', color));
  },

  opacity(value = 1) {
    this.updateSprops((sprops) => sprops.set('opacity', value));
  },

  anchor(value = 'center') {
    this.updateSprops((sprops) => sprops.set('anchor', value));
  },

  rotate(angle = 0) {
    this.updateSprops((sprops) => sprops.set('rotate', angle));
  },

  scale(scalex = 1, scaley = scalex) {
    this.updateSprops((sprops) => sprops
      .set('scalex', scalex)
      .set('scaley', scaley));
  },

  align(value = 'start') {
    this.updateTprops((tprops) => tprops.set('align', value));
  },

  font(fface = 'Helvetica', fsize = 36) {
    this.updateTprops((tprops) => tprops
      .set('fface', fface)
      .set('fsize', fsize));
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
  fsize: 36,
  align: 'start'
});

export class SGraphics extends immutable.Record({
  shapes: immutable.List(),
  sprops: SShapeProps(),
  tprops: STextProps()
}) {
  clear() {
    return this.set('shapes', immutable.List());
  }

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
