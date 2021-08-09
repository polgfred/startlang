import React from 'react';
import ReactDOM from 'react-dom';

// add our custom color and blocks to the builtin blockly stuff
import './blockly';

import App from './ui/app';

import './index.css';

document.addEventListener(
  'DOMContentLoaded',
  () => {
    ReactDOM.render(<App />, document.getElementById('start-wrapper'));
  },
  false
);
