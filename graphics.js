import util from 'util';
import Snap from 'snapsvg';
import { globals, handlerKey } from './runtime';
import { extendObject } from './utils';

function number(s) {
  return parseInt(s, 10);
}

function defaults(el) {
  return el.attr({ fill: '', stroke: '' });
}

function applyTransforms(el) {
  let rot = el.data('rot'),
      skew = el.data('skew'),
      mat = new Snap.Matrix();
  if (rot || skew) {
    let bb = el.getBBox(true); // without transforms
    if (rot) {
      // rotate from the center of the object
      mat.rotate(rot, bb.cx, bb.cy);
    }
    if (skew) {
      // apply the scaling factor
      mat.scale(skew[0], skew[1], bb.cx, bb.cy);
    }
  }
  el.transform(mat);
}

// keep a reference to the canvas element
export const paper = Snap('#canvas');

// all shapes have these basic utilities in common
export const SShape = {
  repr(el) {
    return '*' + el.type + ':' + el.id + '*';
  },

  methods: {
    fill(el, color = null) {
      if (color == null) {
        el.attr('fill', '');
      } else {
        el.attr('fill', color);
      }
    },

    stroke(el, color = null) {
      if (color == null) {
        el.attr('stroke', '');
      } else {
        el.attr('stroke', color);
      }
    },

    opacity(el, opac = 1) {
      if (opac == 1) {
        el.attr('opacity', null);
      } else {
        el.attr('opacity', opac);
      }
    },

    rotate(el, rot = 0) {
      if (rot == 0) {
        el.removeData('rot');
      } else {
        el.data('rot', rot);
      }
      applyTransforms(el);
    },

    scale(el, sx = 1, sy = sx) {
      if (sx == 1 && sy == 1) {
        el.removeData('skew');
      } else {
        el.data('skew', [sx, sy]);
      }
      applyTransforms(el);
    },

    clone(el) {
      let el2 = el.clone();
      // copy transform data
      el2.data(el.data());
      return el2;
    },

    remove(el) {
      el.remove();
    }
  }
};

export const SRect = extendObject(SShape, {
  methods: extendObject(SShape.methods, {
    move(el, x, y) {
      el.attr({ x: x, y: y });
      applyTransforms(el);
    }
  })
});

export const SCircle = extendObject(SShape, {
  methods: extendObject(SShape.methods, {
    move(el, x, y) {
      el.attr({ cx: x, cy: y });
      applyTransforms(el);
    }
  })
});

export const SEllipse = extendObject(SShape, {
  methods: extendObject(SShape.methods, {
    move(el, x, y) {
      el.attr({ cx: x, cy: y });
      applyTransforms(el);
    }
  })
});

export const SLine = extendObject(SShape, {
  methods: extendObject(SShape.methods, {
    move(el, x, y) {
      let attr = el.attr(),
          dx = x - number(attr.x1),
          dy = y - number(attr.y1);
      el.attr({ x1: x, y1: y, x2: number(attr.x2) + dx, y2: number(attr.y2) + dy });
      applyTransforms(el);
    }
  })
});

// used for both polylines and polygons, as it just moves points
export const SPolygon = extendObject(SShape, {
  methods: extendObject(SShape.methods, {
    move(el, x, y) {
      let op = el.attr('points'),
          dx = x - number(op[0]),
          dy = y - number(op[1]),
          np = [];
      np[0] = x;
      np[1] = y;
      for (let i = 2; i < op.length; i += 2) {
        np[i + 0] = number(op[i]) + dx;
        np[i + 1] = number(op[i + 1]) + dy;
      }
      el.attr('points', np);
      applyTransforms(el);
    }
  })
});

// hook into Snap so we can inject a handler property
Snap.plugin(function(_, Element, Paper) {
  let handlerMap = {
    rect: SRect,
    circle: SCircle,
    ellipse: SEllipse,
    line: SLine,
    polyline: SPolygon,
    polygon: SPolygon
  };

  Element.prototype[handlerKey] = (obj) => handlerMap[obj.type];
});

util._extend(globals, {
  rect: function(x, y, w, h) {
    return defaults(paper.rect(x, y, w, h));
  },

  circle: function(x, y, r) {
    return defaults(paper.circle(x, y, r));
  },

  ellipse: function(x, y, rx, ry) {
    return defaults(paper.ellipse(x, y, rx, ry));
  },

  line: function(x1, y1, x2, y2) {
    return defaults(paper.line(x1, y1, x2, y2));
  },

  polyline: function(...coords) {
    return defaults(paper.polyline(...coords));
  },

  polygon: function(...coords) {
    return defaults(paper.polygon(...coords));
  }
});
