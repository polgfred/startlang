'use strict';

import $ from 'jquery';

import React from 'react';

import Base from './base';

export default class Inspector extends Base {
  render() {
    let { hist, snap } = this.props,
        current = hist[snap] || hist[hist.length - 1],
        elems = [];

    if (current) {
      current.ns.forEach((value, key) => {
        elems.push(<tr>
          <td className="start-vars-name">{ key }</td>
          <td className="start-vars-value">{ value }</td>
        </tr>);
      });
    }

    return <div className="start-inspector">
      <div className="start-slider">
        <input type="range"
               min={0}
               max={hist.length}
               value={snap}
               onChange={this.props.updateSlider} />
      </div>
      <div className="start-vars">
        <table>
          <thead>
            <th>Name</th>
            <th>Value</th>
          </thead>
          <tbody>
            { elems }
          </tbody>
        </table>
      </div>
    </div>;
  }
}
