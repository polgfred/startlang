import React, {
  Component,
  createRef,
} from 'react';

import { findDOMNode } from 'react-dom';

import autobind from 'autobind-decorator';

// See graphics.js
const LIST_SHIFT = 5;

export default class Term extends Component {
  constructor(props) {
    super(props);

    this.termInputRef = createRef();
  }

  shouldComponentUpdate(nextProps) {
    return this.props.buf != nextProps.buf;
  }

  render() {
    let { buf } = this.props;
    let elems = [];

    // make sure the list hasn't been modified from the front
    if (buf._origin != 0) {
      throw new Error('terminal buffer has been modified from the front');
    }

    if (buf._root) {
       elems.push(
         <TermOutput
           key={ 0 }
           node={ buf._root }
           level={ buf._level }
         />
			 );
    }
    if (buf._tail) {
       elems.push(
         <TermOutput
           key={ 1 }
           node={ buf._tail }
           level={ 0 }
         />
			 );
    }

    return (
      <div
        className="start-term"
        onClick={ this.handleClick }>
        { elems }
        <TermInput ref={ this.termInputRef } />
      </div>
    );
  }

  getInput(prompt, recv) {
    this.termInputRef.current.getInput(prompt, recv);
  }

  componentDidUpdate() {
    // scroll to the bottom anytime we're updated
    let node = findDOMNode(this);
    node.scrollTop = node.scrollHeight;
  }

  @autobind
  handleClick() {
    this.termInputRef.current.focusInput();
  }
}

class TermOutput extends Component {
  shouldComponentUpdate(nextProps) {
    return this.props.node != nextProps.node;
  }

  render() {
    let { node: { array }, level } = this.props;
    let elems = [];

    if (level == 0) {
      for (let i = 0; i < array.length; ++i) {
        elems.push(
          <p key={ i }>
            { array[i] }
          </p>
        );
      }
    } else {
      for (let i = 0; i < array.length; ++i) {
        elems.push(
          <TermOutput
            key={ i }
            node={ array[i] }
            level={ level - LIST_SHIFT }
          />
				);
      }
    }

    return (
      <div className="start-term-output">
        { elems }
      </div>
    );
  }
}

class TermInput extends Component {
  constructor(props) {
    super(props);

    this.promptRef = createRef();
    this.inputRef = createRef();

    this.state = this.initialState = {
      needsInput: false,
      input: '',
      prompt: null,
      recv: null
    };
  }

  render() {
    return (
      <div
        className="start-term-command"
        style={{
          visibility: this.state.needsInput ? 'visible' : 'hidden'
        }}>
        <span
          ref={ this.promptRef }
          className="start-term-prompt">
          { this.state.prompt }
        </span>
        <input
          ref={ this.inputRef }
          type="text"
          value={ this.state.input }
          className="start-term-input"
          onChange={ this.handleChange }
          onKeyUp={ this.handleKeyUp }
        />
      </div>
    );
  }

  componentDidUpdate() {
    if (this.state.needsInput) {
      // fixup <input> width based on size of prompt
      this.inputRef.current.style.width = this.promptRef.current.offsetWidth + 4 + 'px';
      this.focusInput();
    }
  }

  getInput(prompt, recv) {
    this.setState({ needsInput: true, prompt, recv });
  }

  focusInput() {
    this.inputRef.current.focus();
  }

  @autobind
  handleChange(ev) {
    this.setState({ input: ev.target.value });
  }

  @autobind
  handleKeyUp(ev) {
    if (ev.keyCode == 13) {
      this.state.recv(this.state.input);
      this.setState(this.initialState);
    }
  }
}
