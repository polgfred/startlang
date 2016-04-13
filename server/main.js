'use strict';

import { Meteor } from 'meteor/meteor';

import parser from '../imports/lang/parser.pegjs';
import { SInterpreter } from '../imports/lang/interpreter';
import { SRuntime } from '../imports/lang/runtime';

import Programs from '../imports/api/programs';
import '../imports/api/programs/server/publications';
