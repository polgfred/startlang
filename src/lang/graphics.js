import { produce } from 'immer';

import { handle } from './interpreter.js';

function waitForImmediate() {
  return new Promise((resolve) => {
    setTimeout(resolve, 0);
  });
}

export const graphicsGlobals = (app) => {
  return {
    clear() {
      app.clearDisplay();
    },

    print(...values) {
      if (values.length > 0) {
        for (let i = 0; i < values.length; ++i) {
          const v = values[i];
          termOutput(handle(v).repr(v));
        }
      } else {
        termOutput('');
      }
      return waitForImmediate();
    },

    input(prompt) {
      return new Promise((resolve) => {
        app.setInputState({
          prompt,
          onInputComplete: (input) => {
            resolve(input);
          },
        });
      });
    },

    // shape creation

    rect(x, y, width, height) {
      addShape({ type: 'rect', x, y, width, height });
      return waitForImmediate();
    },

    circle(cx, cy, r) {
      addShape({ type: 'circle', cx, cy, r });
      return waitForImmediate();
    },

    ellipse(cx, cy, rx, ry) {
      addShape({ type: 'ellipse', cx, cy, rx, ry });
      return waitForImmediate();
    },

    line(x1, y1, x2, y2) {
      addShape({ type: 'line', x1, y1, x2, y2 });
      return waitForImmediate();
    },

    text(x, y, value) {
      addShape({ type: 'text', x, y, value });
      return waitForImmediate();
    },

    polygon(...points) {
      addShape({ type: 'polygon', points });
      return waitForImmediate();
    },

    // set shape and text attributes

    color(r, g, b) {
      const hex = (v) => ('0' + Math.round(255 * v).toString(16)).slice(-2);
      return `#${hex(r)}${hex(g)}${hex(b)}`;
    },

    fill(color) {
      updateSprops((sprops) => {
        sprops.fill = color;
      });
    },

    stroke(color) {
      updateSprops((sprops) => {
        sprops.stroke = color;
      });
    },

    opacity(value = 1) {
      updateSprops((sprops) => {
        sprops.opacity = value;
      });
    },

    anchor(value = 'center') {
      updateSprops((sprops) => {
        sprops.anchor = value;
      });
    },

    rotate(angle = 0) {
      updateSprops((sprops) => {
        sprops.rotate = angle;
      });
    },

    scale(scalex = 1, scaley = scalex) {
      updateSprops((sprops) => {
        sprops.scalex = scalex;
        sprops.scaley = scaley;
      });
    },

    align(value = 'start') {
      updateTprops((tprops) => {
        tprops.align = value;
      });
    },

    font(fface = 'Helvetica', fsize = 36) {
      updateTprops((tprops) => {
        tprops.fface = fface;
        tprops.fsize = fsize;
      });
    },
  };

  function addShape(shape) {
    app.setGfx((gfx) =>
      produce(gfx, (dgfx) => {
        dgfx.shapes.push(
          produce(shape, (dshape) => {
            dshape.sprops = gfx.sprops;
            dshape.tprops = gfx.tprops;
          }));
      })
    );
  }

  function updateSprops(mut) {
    app.setGfx((gfx) =>
      produce(gfx, (dgfx) => {
        mut(dgfx.sprops);
      })
    );
  }

  function updateTprops(mut) {
    app.setGfx((gfx) =>
      produce(gfx, (dgfx) => {
        mut(dgfx.tprops);
      })
    );
  }

  function termOutput(line) {
    app.setBuf((buf) =>
      produce(buf, (dbuf) => {
        dbuf.push(line);
      })
    );
  }
};

// visual properties that will get applied to shapes
const shapeProps = {
  stroke: null,
  fill: null,
  opacity: null,
  anchor: 'center',
  rotate: 0,
  scalex: 1,
  scaley: 1,
};

// visual properties that will get applied to text
const textProps = {
  fface: 'Helvetica',
  fsize: 36,
  align: 'start',
};

export const graphicsProps = {
  shapes: [],
  sprops: shapeProps,
  tprops: textProps,
};
