'use strict';

import React from 'react';
import ReactDOM from 'react-dom';

export default class CBase extends React.Component {
  $(selector) {
    let node = ReactDOM.findDOMNode(this);
    return selector ? $(selector, node) : $(node);
  }
}
