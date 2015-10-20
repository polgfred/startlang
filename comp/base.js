'use strict';

import $ from 'jquery';
import React from 'react';
import ReactDOM from 'react-dom';

export default class RBase extends React.Component {
  $(selector) {
    let node = ReactDOM.findDOMNode(this);
    return selector ? $(selector, node) : $(node);
  }
}
