'use strict';

import React from 'react';
import immutable from 'immutable';
import { SRuntime, SBase, handle, handlerKey } from './runtime';
import { extendObject } from './utils';

let graphicsDisplay = document.getElementById('display');

export class SGRuntime extends SRuntime {
  constructor() {
    super();
    this.gfx = immutable.List();
    this.updateDisplay();
  }

  pushShape(data) {
    let shape = new Shape({
      type: data.type,
      attrs: immutable.Map(data.attrs).set('key', `${this.gfx.size}`),
      transforms: immutable.List(data.transforms)
    });

    this.gfx = this.gfx.push(shape);
    this.updateDisplay();
    return shape;
  }

  updateDisplay() {
    React.render(<Graphics data={this.gfx} />, graphicsDisplay);
  }
}

function refresh() {
  return new Promise((resolve) => {
    setImmediate(resolve);
  });
}

SGRuntime.prototype.globals = extendObject(SRuntime.prototype.globals, {
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
    // yield to UI for redraw
    return refresh();
  },

  input(message) {
    return prompt(message);
  },

  clear() {
    console.clear();
    return refresh();
  },

  refresh() {
    return refresh();
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
  },

  polyline(...coords) {
  },

  polygon(...coords) {
  }
});

function setAttribute(ctx, shape, name, value) {
  let index = parseInt(shape.attrs.get('key'));
  let shape2 = shape.set('attrs', shape.attrs.set(name, value));
  ctx.gfx = ctx.gfx.set(index, shape2);
  ctx.updateDisplay();
}

// all shapes have these basic utilities in common
export const SShape = extendObject(SBase, {
  repr(shape) {
    return `*${shape.type}*`;
  },

  methods: {
    fill(shape, color = 'none') {
      setAttribute(this, shape, 'fill', color);
    },

    stroke(el, color = 'none') {
      setAttribute(this, shape, 'stroke', color);
    },

    opacity(el, value = 1) {
      setAttribute(this, shape, 'opacity', value);
    },

    rotate(el, rot = 0) {
    },

    scale(el, sx = 1, sy = sx) {
    },

    clone(el) {
    },

    remove(el) {
    }
  }
});

export const SRect = extendObject(SShape, {
  methods: extendObject(SShape.methods, {
    move(el, x, y) {
    }
  })
});

export const SCircle = extendObject(SShape, {
  methods: extendObject(SShape.methods, {
    move(el, x, y) {
    }
  })
});

export const SEllipse = extendObject(SShape, {
  methods: extendObject(SShape.methods, {
    move(el, x, y) {
    }
  })
});

export const SLine = extendObject(SShape, {
  methods: extendObject(SShape.methods, {
    move(el, x, y) {
    }
  })
});

// used for both polylines and polygons, as it just moves points
export const SPolygon = extendObject(SShape, {
  methods: extendObject(SShape.methods, {
    move(el, x, y) {
    }
  })
});

let Shape = immutable.Record({
  type: null, // rect, circle, ellipse, etc.
  attrs: immutable.Map(),
  transforms: immutable.List()
});

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

let Graphics = React.createClass({
  render() {
    let shapes = this.props.data.map(function(shape) {
      return React.createElement(shape.type, shape.attrs.toJS());
    });

    return <svg id="canvas">{shapes}</svg>;
  }
});

export function createRuntime() {
  return new SGRuntime();
}
