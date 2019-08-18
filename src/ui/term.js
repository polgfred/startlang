import React, { useCallback, useState } from 'react';

// import { findDOMNode } from 'react-dom';

import Button from '@material-ui/core/Button';
import TextField from '@material-ui/core/TextField';

// See graphics.js
const LIST_SHIFT = 5;

export default function Term({ buf }) {
  const [{ needsInput, input, prompt, recv }, setState] = useState({
    needsInput: false,
    input: '',
    prompt: null,
    recv: null,
  });

  // shouldComponentUpdate(nextProps, nextState) {
  //   return (
  //     this.props.buf != nextProps.buf ||
  //     this.state.needsInput != nextState.needsInput ||
  //     this.state.input != nextState.input ||
  //     this.state.prompt != nextState.prompt
  //   );
  // }

  // const getInput = useCallback((prompt, recv) => {
  //   setState({ needsInput: true, input: '', prompt, recv });
  // }, []);

  const handleChange = useCallback(ev => {
    setState(state => ({ ...state, input: ev.target.value }));
  }, []);

  const handleAccept = useCallback(() => {
    recv(input);
    setState({
      needsInput: false,
      input: '',
      prompt: null,
      recv: null,
    });
  }, [input, recv]);

  const handleKeyUp = useCallback(
    ev => {
      if (ev.keyCode == 13) {
        handleAccept();
      }
    },
    [handleAccept]
  );

  // componentDidUpdate() {
  //   // scroll to the bottom anytime we're updated
  //   // FIXME: this doesn't work anymore
  //   // let node = findDOMNode(this);
  //   // node.scrollTop = node.scrollHeight;
  // }

  // make sure the list hasn't been modified from the front
  if (buf._origin != 0) {
    throw new Error('terminal buffer has been modified from the front');
  }

  return (
    <div className="start-term">
      <div
        className="start-term-command"
        style={{
          display: needsInput ? 'block' : 'none',
        }}
      >
        <TextField
          type="string"
          margin="normal"
          value={input}
          label={prompt}
          onChange={handleChange}
          onKeyUp={handleKeyUp}
          autoFocus={true}
        />
        <Button
          color="primary"
          size="small"
          variant="raised"
          onClick={handleAccept}
          style={{
            marginLeft: '12px',
          }}
        >
          OK
        </Button>
      </div>
      <div
        style={{
          fontFamily: 'Roboto',
          fontSize: '14px',
          height: `calc(35vh - ${needsInput ? 152 : 80}px)`,
          overflow: 'scroll',
        }}
      >
        {buf._root && <TermOutput node={buf._root} level={buf._level} />}
        {buf._tail && <TermOutput node={buf._tail} level={0} />}
      </div>
    </div>
  );
}

function TermOutput({ node: { array }, level }) {
  // shouldComponentUpdate(nextProps) {
  //   return (
  //     this.props.node != nextProps.node || this.props.level != nextProps.level
  //   );
  // }

  return (
    <div className="start-term-output">
      {level == 0
        ? array.map((elem, index) => <p key={index}>{elem}</p>)
        : array.map((elem, index) => (
            <TermOutput key={index} node={elem} level={level - LIST_SHIFT} />
          ))}
    </div>
  );
}
