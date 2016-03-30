'use strict';

import { Meteor } from 'meteor/meteor';

import parser from '../imports/lang/parser.pegjs';
import { SInterpreter } from '../imports/lang/interpreter';
import { SRuntime } from '../imports/lang/runtime';
