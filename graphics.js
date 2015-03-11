var util = require('util'),
    Snap = require('snapsvg'),
    runtime = require('./runtime.js'),
    ary = Array.prototype;

function number(s) {
  return parseInt(s, 10);
}

function defaults(el) {
  return el.attr({ fill: 'transparent', stroke: '#000' });
}

function applyTransforms(el) {
  var rot = el.data('rot'),
      skew = el.data('skew'),
      mat = new Snap.Matrix();

  if (rot || skew) {
    var bb = el.getBBox(true); // without transforms

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

var SShape = exports.SShape = {
  // keep a reference to the canvas element
  paper: Snap('#canvas'),

  repr: function(el) {
    return '*' + el.type + ':' + el.id + '*';
  },

  methods: {
    fill: function(el, color) {
      if (color == null) {
        el.attr('fill', 'transparent');
      } else {
        el.attr('fill', color);
      }
    },

    stroke: function(el, color) {
      if (color == null) {
        el.attr('stroke', 'transparent');
      } else {
        el.attr('stroke', color);
      }
    },

    opacity: function(el, opac) {
      if (opac == null || opac == 1) {
        el.attr('opacity', null);
      } else {
        el.attr('opacity', opac);
      }
    },

    rotate: function(el, rot) {
      if (rot == null || rot == 0) {
        el.removeData('rot');
      } else {
        el.data('rot', rot);
      }

      applyTransforms(el);
    },

    scale: function(el, sx, sy) {
      // default sy to sx
      if (sy == null) {
        sy = sx;
      }

      if (sx == null || (sx == 1 && sy == 1)) {
        el.removeData('skew');
      } else {
        el.data('skew', [sx, sy]);
      }

      applyTransforms(el);
    },

    clone: function(el) {
      var el2 = el.clone();
      // copy transform data
      el2.data(el.data());
      return el2;
    },

    remove: function(el) {
      el.remove();
    }
  }
};

function defineShape(methods) {
  var shape = {};
  util._extend(shape, SShape);
  shape.methods = {};
  util._extend(shape.methods, SShape.methods);
  for (var i = 0; i < arguments.length; ++i) {
    util._extend(shape.methods, arguments[i]);
  }
  return shape;
}

var SRect = exports.SRect = defineShape({
  move: function(el, x, y) {
    el.attr({ x: x, y: y });
    applyTransforms(el);
  }
});

var SCircle = exports.SCircle = defineShape({
  move: function(el, x, y) {
    el.attr({ cx: x, cy: y });
    applyTransforms(el);
  }
});

var SEllipse = exports.SEllipse = defineShape({
  move: function(el, x, y) {
    el.attr({ cx: x, cy: y });
    applyTransforms(el);
  }
});

var SLine = exports.SLine = defineShape({
  move: function(el, x, y) {
    var attr = el.attr(),
        dx = x - number(attr.x1),
        dy = y - number(attr.y1);
    el.attr({ x1: x, y1: y, x2: number(attr.x2) + dx, y2: number(attr.y2) + dy });
    applyTransforms(el);
  }
});

var PathSupport = {
  move: function(el, x, y) {
    var op = el.attr('points'), np = [],
        dx = x - number(op[0]),
        dy = y - number(op[1]);
    np[0] = x;
    np[1] = y;
    for (var i = 2; i < op.length; i += 2) {
      np[i + 0] = number(op[i]) + dx;
      np[i + 1] = number(op[i + 1]) + dy;
    }
    el.attr('points', np);
    applyTransforms(el);
  }
};

var SPolyline = exports.SPolyline = defineShape(PathSupport);

var SPolygon = exports.SPolygon = defineShape(PathSupport);

Snap.plugin(function(_, Element, Paper) {
  var handlerMap = {
    rect: SRect,
    circle: SCircle,
    ellipse: SEllipse,
    line: SLine,
    polyline: SPolyline,
    polygon: SPolygon
  };

  Object.defineProperty(Element.prototype, '@@__handler__@@', {
    enumerable: false,
    value: function(obj) {
      return handlerMap[obj.type];
    }
  });
});

util._extend(runtime.globals, {
  rect: function(x, y, w, h) {
    return defaults(SShape.paper.rect(x, y, w, h));
  },

  circle: function(x, y, r) {
    return defaults(SShape.paper.circle(x, y, r));
  },

  ellipse: function(x, y, rx, ry) {
    return defaults(SShape.paper.ellipse(x, y, rx, ry));
  },

  line: function(x1, y1, x2, y2) {
    return defaults(SShape.paper.line(x1, y1, x2, y2));
  },

  polyline: function() {
    return defaults(SShape.paper.polyline(ary.slice.call(arguments)));
  },

  polygon: function() {
    return defaults(SShape.paper.polygon(ary.slice.call(arguments)));
  }
});
