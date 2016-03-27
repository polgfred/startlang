'use strict';

import React from 'react';
import ReactDOM from 'react-dom';

import CApp from './comp/app';

Meteor.startup(() => {
  ReactDOM.render(<CApp />, $('.start-wrapper')[0]);
});
