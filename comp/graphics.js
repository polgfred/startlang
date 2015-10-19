'use strict';

import $ from 'jquery';
import React from 'react';

export class RGraphics extends React.Component {
  render() {
    let originx = Math.floor($('svg').width() / 2),
        originy = Math.floor($('svg').height() / 2);

    let shapes = this.props.data.valueSeq().map((shape) => {
      return <RShape key={shape.key} shape={shape} />;
    });

    //<g transform={`translate(${originx} ${originy}) scale(1 -1)`}>
    return <svg>
      <g>{shapes}</g>
    </svg>;
  }
}

export class RShape extends React.Component {
  render() {
    let shape = this.props.shape,
        attrs = shape.attrs.toJS(),
        trans = shape.transform;

    if (trans) {
      attrs.transform = `matrix(${trans.join(' ')})`;
    }

    return React.createElement(shape.type, attrs);
  }

  shouldComponentUpdate(nextProps) {
    return this.props.shape.attrs != nextProps.shape.attrs ||
            this.props.shape.transform != nextProps.shape.transform;
  }
}
