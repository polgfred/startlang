'use strict';

import { Meteor } from 'meteor/meteor';
import { $ } from 'meteor/jquery';

import React from 'react';
import ReactDOM from 'react-dom';

import CApp from './comp/app';

Meteor.startup(() => {
  ReactDOM.render(<CApp />, $('.start-wrapper')[0]);
});
