'use strict';

import { Meteor } from 'meteor/meteor';
import { $ } from 'meteor/jquery';

import React from 'react';
import ReactDOM from 'react-dom';

import App from '../imports/ui/app';

Meteor.startup(() => {
  ReactDOM.render(<App />, $('.start-wrapper')[0]);
});
