'use strict';

import $ from 'jquery';

import React from 'react';
import ReactDOM from 'react-dom';

import App from './ui/app';

import './main.scss';

$(() => ReactDOM.render(<App />, $('.start-wrapper')[0]));
