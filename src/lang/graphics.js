import { produce } from 'immer';

import { handle } from './interpreter.js';

export const graphicsGlobals = (app) => {
  return {
    repaint() {
      // let the DOM catch up
      return new Promise((resolve) => {
        queueMicrotask(resolve);
      });
    },

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
      addShape(rect({ x, y, width, height }));
    },

    circle(cx, cy, r) {
      addShape(circle({ cx, cy, r }));
    },

    ellipse(cx, cy, rx, ry) {
      addShape(ellipse({ cx, cy, rx, ry }));
    },

    line(x1, y1, x2, y2) {
      addShape(line({ x1, y1, x2, y2 }));
    },

    text(x, y, value) {
      addShape(text({ x, y, value }));
    },

    polygon(...points) {
      if (Array.isArray(points[0])) {
        points = points[0];
      }
      addShape(polygon({ points }));
    },

    // set shape and text attributes

    color(r, g, b) {
      const hex = (v) => ('0' + Math.round(255 * v).toString(16)).substr(-2);
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
        shape.sprops = gfx.sprops;
        shape.tprops = gfx.tprops;
        dgfx.shapes.push(shape);
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

function rect(attrs) {
  return {
    type: 'rect',
    x: 0,
    y: 0,
    width: 0,
    height: 0,
    ...attrs,
  };
}

function circle(attrs) {
  return {
    type: 'circle',
    cx: 0,
    cy: 0,
    r: 0,
    ...attrs,
  };
}

function ellipse(attrs) {
  return {
    type: 'ellipse',
    cx: 0,
    cy: 0,
    rx: 0,
    ry: 0,
    ...attrs,
  };
}

function line(attrs) {
  return {
    type: 'line',
    x1: 0,
    y1: 0,
    x2: 0,
    y2: 0,
    ...attrs,
  };
}

function polygon(attrs) {
  return {
    type: 'polygon',
    points: [],
    ...attrs,
  };
}

function text(attrs) {
  return {
    type: 'text',
    x: 0,
    y: 0,
    value: '',
    ...attrs,
  };
}
