'use strict';

import React from 'react';
import ReactDOM from 'react-dom';

import CBase from './base';

export default class CTerm extends CBase {
  constructor(props) {
    super(props);

    this.handleClick = this.handleClick.bind(this);
  }

  shouldComponentUpdate(nextProps) {
    return this.props.buf != nextProps.buf;
  }

  render() {
    return <div className="start-terminal" onClick={ this.handleClick }>
      <CTermOutput buf={ this.props.buf } />
      <CTermInput ref="input" />
    </div>;
  }

  getInput(prompt, recv) {
    this.refs.input.getInput(prompt, recv);
  }

  componentDidUpdate() {
    // scroll to the bottom anytime we're updated
    this.$().prop('scrollTop', this.$().prop('scrollHeight'));
  }

  handleClick() {
    this.$('.terminal-text').focus();
  }
}

export class CTermOutput extends CBase {
  shouldComponentUpdate(nextProps) {
    return this.props.buf != nextProps.buf;
  }

  render() {
    let lines = this.props.buf.map((line, i) =>
          <div key={i} className="terminal-output-line">{line}</div>);

    return <div className="terminal-output">{lines}</div>;
  }
}

export class CTermInput extends CBase {
  constructor(props) {
    super(props);

    this.handleChange = this.handleChange.bind(this);
    this.handleKeyUp = this.handleKeyUp.bind(this);

    this.state = this.initialState = {
      needsInput: false,
      input: null,
      prompt: null,
      recv: null
    };
  }

  render() {
    return <div style={{ visibility: this.state.needsInput ? 'visible' : 'hidden' }}
                className="terminal-command">
      <span className="terminal-prompt">{ this.state.prompt }</span>
      <input type="text" value={ this.state.input }
             className="terminal-text"
             onChange={ this.handleChange }
             onKeyUp={ this.handleKeyUp } />
    </div>;
  }

  componentDidUpdate() {
    if (this.state.needsInput) {
      // fixup <input> width based on size of prompt
      this.$('.terminal-text')
        .css('width', 'calc(100% - ' + (this.$('.terminal-prompt').width() + 20) + 'px)')
        .focus();
    }
  }

  getInput(prompt, recv) {
    this.setState({ needsInput: true, input: '', prompt, recv });
  }

  handleChange(ev) {
    this.setState({ input: ev.target.value });
  }

  handleKeyUp(ev) {
    if (ev.keyCode == 13) {
      this.state.recv(this.state.input);
      this.setState(this.initialState);
    }
  }
}
