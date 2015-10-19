'use strict';

import React from 'react';
import ReactDOM from 'react-dom';

export class RTerm extends React.Component {
  render() {
    return <div className="terminal">
      <RTermOutput buf={this.props.buf} />
      <RTermInput ref="input"
                  prompt={this.props.prompt}
                  needsInput={this.props.needsInput}
                  inputReceived={this.props.inputReceived} />
    </div>;
  }

  componentDidUpdate() {
    // scroll to the bottom anytime we're updated
    let node = ReactDOM.findDOMNode(this);
    node.scrollTop = node.scrollHeight;
  }
}

export class RTermOutput extends React.Component {
  render() {
    let lines = this.props.buf.map((line, i) =>
          <div key={i} className="terminal-output-line">{line}</div>);

    return <div className="terminal-output">{lines}</div>;
  }

  shouldComponentUpdate(nextProps) {
    return this.props.buf != nextProps.buf;
  }
}

export class RTermInput extends React.Component {
  constructor() {
    super();
    this.state = { input: '' };
  }

  render() {
    return <div className="terminal-command">
      <span className="terminal-prompt">{this.props.prompt}</span>
      <input type="text" value={this.state.input}
             className="terminal-text"
             onChange={this.handleChange.bind(this)}
             onKeyUp={this.handleKeyUp.bind(this)} />
    </div>;
  }

  handleChange(ev) {
    this.setState({ input: ev.target.value });
  }

  handleKeyUp(ev) {
    if (ev.keyCode == 13) {
      this.props.inputReceived(this.state.input);
      this.setState({ input: '' });
    }
  }
}
