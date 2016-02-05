'use strict';

import $ from 'jquery';
import React from 'react';
import RBase from './base';

export default class RGraphics extends RBase {
  render() {
    // let dims = $('svg')[0].getBoundingClientRect(),
    //     originx = Math.floor(dims.width / 2),
    //     originy = Math.floor(dims.height / 2);
    //<g transform={`translate(${originx} ${originy}) scale(1 -1)`}>

    let shapes = this.props.data.valueSeq().map((shape) => {
      return <RShape key={shape.key} shape={shape} />;
    });

    return <svg>
      <g>{shapes}</g>
    </svg>;
  }
}

export class RShape extends RBase {
  render() {
    let shape = this.props.shape,
        attrs = shape.attrs.toObject(),
        trans = '';

    if (shape.angle) {
      trans += ` rotate(${shape.angle})`;
    }
    if (shape.scalex != 1 || shape.scaley != 1) {
      trans += ` scale(${shape.scalex} ${shape.scaley})`;
    }
    if (trans) {
      attrs.transform = trans.substr(1);
    }

    return <g transform={`translate(${shape.x} ${shape.y})`}>
      {React.createElement(shape.type, attrs)}
    </g>;
  }

  shouldComponentUpdate(nextProps) {
    return this.props.shape != nextProps.shape;
  }
}
