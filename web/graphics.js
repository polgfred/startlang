var util = require('util'),
    runtime = require('../runtime.js'),
    Snap = require('snapsvg');

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
      el.attr('fill', color);
    },

    stroke: function(el, color) {
      el.attr('stroke', color);
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

var SRect = exports.SShape = {};
util._extend(SRect, SShape);
util._extend(SRect, {
  methods: {}
});

util._extend(SRect.methods, SShape.methods);
util._extend(SRect.methods, {
  move: function(el, x, y) {
    el.attr({ x: x, y: y });

    applyTransforms(el);
  }
});

var SCircle = exports.SShape = {};
util._extend(SCircle, SShape);
util._extend(SCircle, {
  methods: {}
});

util._extend(SCircle.methods, SShape.methods);
util._extend(SCircle.methods, {
  move: function(el, x, y) {
    el.attr({ cx: x, cy: y });

    applyTransforms(el);
  }
});

var SEllipse = exports.SShape = {};
util._extend(SEllipse, SShape);
util._extend(SEllipse, {
  methods: {}
});

util._extend(SEllipse.methods, SShape.methods);
util._extend(SEllipse.methods, {
  move: function(el, x, y) {
    el.attr({ cx: x, cy: y });

    applyTransforms(el);
  }
});

Snap.plugin(function(_, Element, Paper) {
  var handlerMap = {
    circle: SCircle,
    ellipse: SEllipse,
    rect: SRect
  };

  Object.defineProperty(Element.prototype, '@@__handler__@@', {
    enumerable: false,
    value: function(obj) {
      return handlerMap[obj.type];
    }
  });
});

util._extend(runtime.globals, {
  circle: function(x, y, r) {
    return SShape.paper.circle(x, y, r);
  },

  ellipse: function(x, y, rx, ry) {
    return SShape.paper.ellipse(x, y, rx, ry);
  },

  rect: function(x, y, w, h) {
    return SShape.paper.rect(x, y, w, h);
  }
});
