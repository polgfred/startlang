import React from 'react';
import ReactDOM from 'react-dom';

import App from './ui/app';

import './main.css';

document.addEventListener(
  'DOMContentLoaded',
  () => {
    ReactDOM.render(<App />, document.getElementById('start-wrapper'));
  },
  false
);
