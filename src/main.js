import React from 'react';
import ReactDOM from 'react-dom';

// serve up fonts for the ui
import 'typeface-roboto';
import 'typeface-roboto-mono';

// add our custom color and blocks to the builtin blockly stuff
import './blockly';

import App from './ui/app';

// import './main.css';

document.addEventListener(
  'DOMContentLoaded',
  () => {
    ReactDOM.render(<App />, document.getElementById('start-wrapper'));
  },
  false
);
