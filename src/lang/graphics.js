import { nextTick } from 'process';

import immutable from 'immutable';

import { makeRuntime, globalsKey } from './runtime';

export function makeGraphicsRuntime(app) {
  const { [globalsKey]: globals, ...rt } = makeRuntime(app);

  return {
    ...rt,

    [globalsKey]: {
      ...globals,

      repaint() {
        // let the DOM catch up
        return new Promise(resolve => {
          nextTick(resolve);
        });
      },

      clear() {
        app.clearDisplay();
      },

      print(...values) {
        if (values.length > 0) {
          for (let i = 0; i < values.length; ++i) {
            let v = values[i];
            termOutput(rt.handle(v).repr(v));
          }
        } else {
          termOutput('');
        }
      },

      input(prompt) {
        return new Promise(resolve => {
          app.termInput(prompt, input => {
            resolve(input);
          });
        });
      },

      // shape creation

      rect(x, y, width, height) {
        addShape(Rect, { x, y, width, height });
      },

      circle(cx, cy, r) {
        addShape(Circle, { cx, cy, r });
      },

      ellipse(cx, cy, rx, ry) {
        addShape(Ellipse, { cx, cy, rx, ry });
      },

      line(x1, y1, x2, y2) {
        addShape(Line, { x1, y1, x2, y2 });
      },

      text(x, y, text) {
        addShape(Text, { x, y, text });
      },

      polygon(...points) {
        points = immutable.List.isList(points[0])
          ? points[0]
          : immutable.List(points);

        addShape(Polygon, { points });
      },

      // set shape and text attributes

      color(r, g, b) {
        let hex = v => ('0' + Math.round(255 * v).toString(16)).substr(-2);
        return `#${hex(r)}${hex(g)}${hex(b)}`;
      },

      fill(color) {
        updateSprops(sprops => sprops.set('fill', color));
      },

      stroke(color) {
        updateSprops(sprops => sprops.set('stroke', color));
      },

      opacity(value = 1) {
        updateSprops(sprops => sprops.set('opacity', value));
      },

      anchor(value = 'center') {
        updateSprops(sprops => sprops.set('anchor', value));
      },

      rotate(angle = 0) {
        updateSprops(sprops => sprops.set('rotate', angle));
      },

      scale(scalex = 1, scaley = scalex) {
        updateSprops(sprops =>
          sprops.set('scalex', scalex).set('scaley', scaley)
        );
      },

      align(value = 'start') {
        updateTprops(tprops => tprops.set('align', value));
      },

      font(fface = 'Helvetica', fsize = 36) {
        updateTprops(tprops => tprops.set('fface', fface).set('fsize', fsize));
      },
    },
  };

  function addShape(type, attrs) {
    app.gfxUpdate(gfx => gfx.addShape(type, attrs));
  }

  function updateSprops(mut) {
    app.gfxUpdate(gfx => gfx.updateSprops(mut));
  }

  function updateTprops(mut) {
    app.gfxUpdate(gfx => gfx.updateTprops(mut));
  }

  function termOutput(line) {
    app.termUpdate(buf => buf.push(line));
  }
}

// visual properties that will get applied to shapes
const SShapeProps = immutable.Record({
  stroke: null,
  fill: null,
  opacity: null,
  anchor: 'center',
  rotate: 0,
  scalex: 1,
  scaley: 1,
});

// visual properties that will get applied to text
const STextProps = immutable.Record({
  fface: 'Helvetica',
  fsize: 36,
  align: 'start',
});

export class SGraphics extends immutable.Record({
  shapes: immutable.List(),
  sprops: SShapeProps(),
  tprops: STextProps(),
}) {
  clear() {
    return this.set('shapes', immutable.List());
  }

  addShape(rec, attrs) {
    // set the current graphics props on the shape
    attrs.sprops = this.sprops;
    attrs.tprops = this.tprops;
    return this.update('shapes', shapes => shapes.push(rec(attrs)));
  }

  removeShapes(num) {
    return this.update('shapes', shapes => shapes.skipLast(num));
  }

  updateSprops(mut) {
    return this.update('sprops', sprops => mut(sprops));
  }

  updateTprops(mut) {
    return this.update('tprops', tprops => mut(tprops));
  }
}

const Rect = immutable.Record({
  type: 'rect',
  x: 0,
  y: 0,
  width: 0,
  height: 0,
  sprops: SShapeProps(),
});

const Circle = immutable.Record({
  type: 'circle',
  cx: 0,
  cy: 0,
  r: 0,
  sprops: SShapeProps(),
});

const Ellipse = immutable.Record({
  type: 'ellipse',
  cx: 0,
  cy: 0,
  rx: 0,
  ry: 0,
  sprops: SShapeProps(),
});

const Line = immutable.Record({
  type: 'line',
  x1: 0,
  y1: 0,
  x2: 0,
  y2: 0,
  sprops: SShapeProps(),
});

const Polygon = immutable.Record({
  type: 'polygon',
  points: immutable.List(),
  sprops: SShapeProps(),
});

const Text = immutable.Record({
  type: 'text',
  x: 0,
  y: 0,
  text: '',
  sprops: SShapeProps(),
  tprops: STextProps(),
});
