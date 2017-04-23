'use strict';

import moment from 'moment';
import immutable from 'immutable';

import React from 'react';

import Base from './base';

export default class Inspector extends Base {
  render() {
    let { hist, snap } = this.props,
        current = hist[snap] || hist[hist.length - 1],
        elems = [];

    if (current) {
      current.ns.forEach((value, key) => {
        elems.push(<tr key={key}>
          <td className="start-vars-name">{ key }</td>
          <td className="start-vars-value">{ inspectorFor(value) }</td>
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
            <tr>
              <th>Name</th>
              <th>Value</th>
            </tr>
          </thead>
          <tbody>
            { elems }
          </tbody>
        </table>
      </div>
    </div>;
  }
}

let inspectorKey = Symbol('START_INSPECTOR');

class NoneInspector extends Base {
  render() {
    return <span className="start-vars-type-none">*none*</span>;
  }
}

class BooleanInspector extends Base {
  render() {
    return <span className="start-vars-type-boolean">
      { this.props.value ? '*true*' : '*false*' }
    </span>;
  }
}

Boolean.prototype[inspectorKey] = BooleanInspector;

class NumberInspector extends Base {
  render() {
    let n = this.props.value;
    return <span className="start-vars-type-number">
      { isFinite(n) ? n : (n > 0 ? '*infinity*' : '-*infinity') }
    </span>;
  }
}

Number.prototype[inspectorKey] = NumberInspector;

class StringInspector extends Base {
  render() {
    return <span className="start-vars-type-string">
      { this.props.value }
    </span>;
  }
}

String.prototype[inspectorKey] = StringInspector;

class TimeInspector extends Base {
  render() {
    return <span className="start-vars-type-time">
      { this.props.value.format('l LTS') }
    </span>;
  }
}

moment.fn[inspectorKey] = TimeInspector;

class ListInspector extends Base {
  render() {
    let elems = [];

    this.props.value.forEach((item, i) => {
      elems.push(<li key={i}>{ inspectorFor(item) }</li>);
    });

    return <ul className="start-vars-type-list">
      { elems }
    </ul>;
  }
}

immutable.List.prototype[inspectorKey] = ListInspector;

class TableInspector extends Base {
  render() {
    let elems = [];

    this.props.value.forEach((value, key) => {
      elems.push(<li key={key}>
        { inspectorFor(key) }: { inspectorFor(value) }
      </li>);
    });

    return <ul className="start-vars-type-list">
      { elems }
    </ul>;
  }
}

immutable.OrderedMap.prototype[inspectorKey] = TableInspector;

function inspectorFor(value) {
  let inspector = value == null ? NoneInspector : value[inspectorKey];
  return React.createElement(inspector, { value });
}
