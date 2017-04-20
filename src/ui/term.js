'use strict';

import $ from 'jquery';
import _ from 'lodash';

import React from 'react';

import Base from './base';

// See graphics.js
const LIST_SHIFT = 5;

export default class Term extends Base {
  constructor(props) {
    super(props);

    _.bindAll(this, 'handleClick');
  }

  shouldComponentUpdate(nextProps) {
    return this.props.buf != nextProps.buf;
  }

  render() {
    let { buf } = this.props, elems = [];

    // make sure the list hasn't been modified from the front
    if (buf._origin != 0) {
      throw new Error('terminal buffer has been modified from the front');
    }
    if (buf._root) {
       elems.push(<TermOutput key={0} node={buf._root} level={buf._level} />);
    }
    if (buf._tail) {
       elems.push(<TermOutput key={1} node={buf._tail} level={0} />);
    }

    return <div className="start-term" onClick={this.handleClick}>
      { elems }
      <TermInput ref="input" />
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
    this.$('.start-term-input').focus();
  }
}

class TermOutput extends Base {
  shouldComponentUpdate(nextProps) {
    return this.props.node != nextProps.node;
  }

  render() {
    let { node: { array }, level } = this.props, elems = [];

    if (level == 0) {
      for (let i = 0; i < array.length; ++i) {
        elems.push(<p key={i}>{ array[i] }</p>);
      }
    } else {
      for (let i = 0; i < array.length; ++i) {
        elems.push(<TermOutput key={i} node={array[i]} level={level - LIST_SHIFT} />);
      }
    }

    return <div className="start-term-output">{ elems }</div>;
  }
}

class TermInput extends Base {
  constructor(props) {
    super(props);

    _.bindAll(this, 'handleChange', 'handleKeyUp');

    this.state = this.initialState = {
      needsInput: false,
      input: '',
      prompt: null,
      recv: null
    };
  }

  render() {
    return <div style={{ visibility: this.state.needsInput ? 'visible' : 'hidden' }}
                className="start-term-command">
      <span className="start-term-prompt">{this.state.prompt}</span>
      <input type="text" value={this.state.input}
             className="start-term-input"
             onChange={this.handleChange}
             onKeyUp={this.handleKeyUp} />
    </div>;
  }

  componentDidUpdate() {
    if (this.state.needsInput) {
      // fixup <input> width based on size of prompt
      this.$('.start-term-input')
        .css('width', 'calc(100% - ' + (this.$('.start-term-prompt').width() + 4) + 'px)')
        .focus();
    }
  }

  getInput(prompt, recv) {
    this.setState({ needsInput: true, prompt, recv });
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
