import ReactDOM from 'react-dom';

// add our custom color and blocks to the builtin blockly stuff
import './blockly/index.js';

import App from './ui/app.jsx';

import './index.css';

document.addEventListener(
  'DOMContentLoaded',
  () => {
    ReactDOM.render(<App />, document.getElementById('start-wrapper'));
  },
  false
);
