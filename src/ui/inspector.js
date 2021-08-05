import Button from '@material-ui/core/Button';
import Table from '@material-ui/core/Table';
import TableBody from '@material-ui/core/TableBody';
import TableCell from '@material-ui/core/TableCell';
import TableFooter from '@material-ui/core/TableFooter';
import TableHead from '@material-ui/core/TableHead';
import TableRow from '@material-ui/core/TableRow';
import immutable from 'immutable';
import moment from 'moment';
import React, { Component } from 'react';

export default class Inspector extends Component {
  render() {
    let { hist, snap, updateSlider } = this.props;

    let current = hist[snap] || hist[hist.length - 1];

    return (
      <div
        className="start-inspector"
        style={{
          fontFamily: 'Roboto',
          fontSize: 14,
          height: 'calc(100vh - 120px)',
        }}
      >
        <div
          className="start-slider"
          style={{
            marginBottom: '20px',
          }}
        >
          <input
            type="range"
            min={0}
            max={hist.length - 1}
            value={snap}
            onChange={updateSlider}
            style={{
              margin: '0 10px',
              width: 'calc(100% - 20px)',
            }}
          />
        </div>
        <div
          className="start-vars"
          style={{
            height: 'calc(100vh - 160px)',
            overflow: 'scroll',
          }}
        >
          <Table
            style={{
              width: '100%',
            }}
          >
            <TableHead>
              <TableRow>
                <TableCell
                  className="start-vars-name"
                  style={{
                    fontWeight: 'bold',
                    width: '25%',
                  }}
                >
                  Variable
                </TableCell>
                <TableCell
                  className="start-vars-value"
                  style={{
                    width: '75%',
                  }}
                >
                  Value
                </TableCell>
              </TableRow>
            </TableHead>
            {current && (
              <TableBody>
                {current.ns
                  .map((value, key) => (
                    <TableRow key={key}>
                      <TableCell className="start-vars-name">{key}</TableCell>
                      <TableCell className="start-vars-value">
                        {inspectorFor(value)}
                      </TableCell>
                    </TableRow>
                  ))
                  .toList()}
              </TableBody>
            )}
          </Table>
        </div>
      </div>
    );
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
    return (
      <span className="start-vars-type-boolean">
        {this.props.value ? '*true*' : '*false*'}
      </span>
    );
  }
}

Boolean.prototype[inspectorKey] = BooleanInspector;

class NumberInspector extends Component {
  render() {
    let { value } = this.props;

    return (
      <span className="start-vars-type-number">
        {isFinite(value) ? value : value > 0 ? '*infinity*' : '-*infinity'}
      </span>
    );
  }
}

Number.prototype[inspectorKey] = NumberInspector;

class StringInspector extends Component {
  render() {
    return <span className="start-vars-type-string">{this.props.value}</span>;
  }
}

String.prototype[inspectorKey] = StringInspector;

class TimeInspector extends Component {
  render() {
    return (
      <span className="start-vars-type-time">
        {this.props.value.format('l LTS')}
      </span>
    );
  }
}

moment.fn[inspectorKey] = TimeInspector;

class ExpandableInspector extends Component {
  constructor() {
    super();

    this.state = { visible: 5 };
  }

  handleShowMore() {
    this.setState((state) => ({ visible: state.visible + 5 }));
  }

  footer() {
    return (
      <TableFooter>
        <TableRow key="trunc">
          <TableCell colSpan="2" className="start-vars-expando-more">
            <Button color="secondary" onClick={this.handleShowMore}>
              More
            </Button>
          </TableCell>
        </TableRow>
      </TableFooter>
    );
  }
}

class ListInspector extends ExpandableInspector {
  render() {
    let { value } = this.props;
    let { visible } = this.state;

    return (
      <Table
        className="start-vars-type-list"
        style={{
          marginBottom: '10px',
          width: '100%',
        }}
      >
        <TableHead>
          <TableRow>
            <TableCell
              className="start-vars-list-item"
              style={{
                width: '75%',
              }}
            >
              Items
            </TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {value.take(visible).map((item, index) => (
            <TableRow key={index}>
              <TableCell className="start-vars-list-item">
                {inspectorFor(item)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
        {value.size > visible && this.footer()}
      </Table>
    );
  }
}

immutable.List.prototype[inspectorKey] = ListInspector;

class TableInspector extends ExpandableInspector {
  render() {
    let { value } = this.props;
    let { visible } = this.state;

    return (
      <Table
        className="start-vars-type-table"
        style={{
          marginBottom: '10px',
          width: '100%',
        }}
      >
        <TableHead>
          <TableRow>
            <TableCell
              className="start-vars-table-key"
              style={{
                width: '25%',
              }}
            >
              Key
            </TableCell>
            <TableCell
              className="start-vars-table-value"
              style={{
                width: '75%',
              }}
            >
              Value
            </TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {value
            .take(visible)
            .map((value, key) => (
              <TableRow key={key}>
                <TableCell className="start-vars-table-key">
                  {inspectorFor(key)}
                </TableCell>
                <TableCell className="start-vars-table-item">
                  {inspectorFor(value)}
                </TableCell>
              </TableRow>
            ))
            .toList()}
        </TableBody>
        {value.size > visible && this.footer()}
      </Table>
    );
  }
}

immutable.OrderedMap.prototype[inspectorKey] = TableInspector;

function inspectorFor(value) {
  let inspector =
    value === null || value === undefined ? NoneInspector : value[inspectorKey];

  return React.createElement(inspector, { value });
}
