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
      key: `${data.type}${Math.floor(Math.random() * (2<<29))}`,
      attrs: immutable.Map(data.attrs),
      transforms: immutable.List(data.transforms)
    });

    this.gfx = this.gfx.push(shape);
    this.updateDisplay();
    return shape;
  }

  updateShape(shape, name, value) {
    // cache this lookup eventually
    let pos = this.gfx.findIndex((sh) => sh.key == shape.key);
    let shape2 = shape.set('attrs', shape.attrs.set(name, value));
    this.gfx = this.gfx.set(pos, shape2);
    this.updateDisplay();
  }

  updateDisplay() {
    React.render(<RGraphics data={this.gfx} />, graphicsDisplay);
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

  rgb(r, g, b) {
    return '#' + ('0' + Math.round(255 * r).toString(16)).substr(-2) +
                 ('0' + Math.round(255 * g).toString(16)).substr(-2) +
                 ('0' + Math.round(255 * b).toString(16)).substr(-2);
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

// all shapes have these basic utilities in common
export const SShape = extendObject(SBase, {
  repr(shape) {
    return `*${shape.type}*`;
  },

  methods: {
    fill(shape, color) {
      this.updateShape(shape, 'fill', color || 'none');
    },

    stroke(el, color) {
      this.updateShape(shape, 'stroke', color || 'none');
    },

    opacity(el, value = 1) {
      this.updateShape(shape, 'opacity', value);
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
  key: null,  // identifier for lookup
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

let RGraphics = React.createClass({
  render() {
    let shapes = this.props.data.map(function(shape) {
      // add the key to the element attrs
      let attrs = shape.attrs.toJS();
      attrs.key = shape.key;
      return React.createElement(shape.type, attrs);
    });

    return <svg id="canvas">{shapes}</svg>;
  }
});

export function createRuntime() {
  return new SGRuntime();
}
