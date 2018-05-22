import moment from 'moment';
import immutable from 'immutable';
import autobind from 'autobind-decorator';

import React, { Component } from 'react';

import Button from '@material-ui/core';

export default class Inspector extends Component {
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
               max={hist.length - 1}
               value={snap}
               onChange={this.props.updateSlider} />
      </div>
      <div className="start-vars">
        <table>
          <thead>
            <tr>
              <th className="start-vars-name">Variable</th>
              <th className="start-vars-value">Value</th>
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

class NoneInspector extends Component {
  render() {
    return <span className="start-vars-type-none">*none*</span>;
  }
}

class BooleanInspector extends Component {
  render() {
    return <span className="start-vars-type-boolean">
      { this.props.value ? '*true*' : '*false*' }
    </span>;
  }
}

Boolean.prototype[inspectorKey] = BooleanInspector;

class NumberInspector extends Component {
  render() {
    let n = this.props.value;
    return <span className="start-vars-type-number">
      { isFinite(n) ? n : (n > 0 ? '*infinity*' : '-*infinity') }
    </span>;
  }
}

Number.prototype[inspectorKey] = NumberInspector;

class StringInspector extends Component {
  render() {
    return <span className="start-vars-type-string">
      { this.props.value }
    </span>;
  }
}

String.prototype[inspectorKey] = StringInspector;

class TimeInspector extends Component {
  render() {
    return <span className="start-vars-type-time">
      { this.props.value.format('l LTS') }
    </span>;
  }
}

moment.fn[inspectorKey] = TimeInspector;

class ExpandableInspector extends Component {
  constructor() {
    super();

    this.state = { visible: 5 };
  }

  @autobind
  handleShowMore() {
    this.setState((state) => ({ visible: state.visible + 5 }));
  }

  footer() {
    return <tfoot>
      <tr key="trunc">
        <td colSpan="2" className="start-vars-expando-more">
          <Button onClick={this.handleShowMore}>More...</Button>
        </td>
      </tr>
    </tfoot>;
  }
}

class ListInspector extends ExpandableInspector {
  render() {
    let elems = [], more = false;

    this.props.value.forEach((item, i) => {
      elems.push(<tr key={i}>
        <td className="start-vars-list-item">
          { inspectorFor(item) }
        </td>
      </tr>);

      if (i >= this.state.visible - 1) {
        more = true;
        return false;
      }
    });

    return <table className="start-vars-type-list">
      <thead>
        <tr>
          <th className="start-vars-list-item">Items</th>
        </tr>
      </thead>
      <tbody>
        { elems }
      </tbody>
      { more && this.footer() }
    </table>;
  }
}

immutable.List.prototype[inspectorKey] = ListInspector;

class TableInspector extends ExpandableInspector {
  render() {
    let elems = [], i, more = false;

    this.props.value.forEach((value, key) => {
      elems.push(<tr key={key}>
        <td className="start-vars-table-key">
          { inspectorFor(key) }
        </td>
        <td className="start-vars-table-item">
          { inspectorFor(value) }
        </td>
      </tr>);

      if (++i >= this.state.visible - 1) {
        more = true;
        return false;
      }
    });

    return <table className="start-vars-type-table">
      <thead>
        <tr>
          <th className="start-vars-table-key">Key</th>
          <th className="start-vars-table-value">Value</th>
        </tr>
      </thead>
      <tbody>
        { elems }
      </tbody>
      { more && this.footer() }
    </table>;
  }
}

immutable.OrderedMap.prototype[inspectorKey] = TableInspector;

function inspectorFor(value) {
  let inspector = value == null ? NoneInspector : value[inspectorKey];
  return React.createElement(inspector, { value });
}
