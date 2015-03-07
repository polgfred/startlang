var util = require('util'),
    runtime = require('../runtime.js'),
    Snap = require('snapsvg');

var SShape = exports.SShape = {
  // keep a reference to the canvas element
  paper: Snap('#canvas'),

  methods: {}
};

var SCircle = exports.SCircle = {
  repr: function(circ) {
    return '*circle(' + circ.id + ')*'
  },

  methods: {}
};

util._extend(SCircle.methods, SShape.methods);
util._extend(SCircle.methods, {
  moveto: function(el, x, y) {
    el.attr({ cx: x, cy: y });
  }
});

var SRect = exports.SCircle = {
  repr: function(rect) {
    return '*rect(' + rect.id + ')*'
  },

  methods: {}
};

util._extend(SRect.methods, SShape.methods);
util._extend(SRect.methods, {
  moveto: function(el, x, y) {
    el.attr({ x: x, y: y });
  }
});

Snap.plugin(function(_, Element, Paper) {
  var handlerMap = {
    circle: SCircle,
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

  rect: function(x, y, w, h) {
    return SShape.paper.rect(x, y, w, h);
  }
});
