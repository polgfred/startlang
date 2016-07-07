#!/usr/bin/env babel-node

'use strict';

import { readFileSync } from 'fs';
import { inspect } from 'util';
import { transform } from 'babel-core';

import PEG from 'pegjs';

import { SRuntime } from '../../imports/lang/runtime';
import { SInterpreter } from '../../imports/lang/interpreter';

let parser = (() => {
  // build the parser the hard way, we'll cache this later
  let peg = readFileSync(__dirname + '/../../imports/lang/parser.pegjs', 'utf-8');
  let js = PEG.buildParser(peg, { output: 'source' });

  return eval(transform(js, {
    presets: [ 'es2015' ],
    compact: true
  }).code);
})();

function output(obj) {
  console.log(inspect(obj, inspectOpts));
}

let options = {}, parserOptions = {};

let inspectOpts = {
  colors: true,
  depth: null
};

if (process.argv.indexOf('--ast') != -1) {
  options.ast = true;
  parserOptions.ast = true;
}

if (process.argv.indexOf('--ns') != -1) {
  options.ns = true;
}

if (process.argv.indexOf('--time') != -1) {
  options.time = true;
}

if (process.argv.indexOf('--meta') != -1) {
  options.ast = true;
  parserOptions.ast = parserOptions.meta = true;
}

let interp, start, end;

Promise.resolve()
  .then(() => readFileSync(process.argv[2], 'utf-8'))
  .catch((err) => process.argv[2] + '\n')
  .then((source) => parser.parse(source, parserOptions))
  .then((root) => {
    if (options.ast) {
      output(root);
      process.exit();
    }

    interp = new SInterpreter();
    interp.runtime = new SRuntime();
    interp.root = root;

    if (options.time) {
      start = new Date;
      console.error('start', start);
    }

    return interp.run();
  }).catch((err) => {
    if (err.stack) {
      console.log(err.stack);
    }

    if (interp.frame) {
      output(interp.frame.node);
    }
  }).then(() => {
    if (options.time) {
      end = new Date;
      console.error('end', end);
      console.error('time (ms)', end - start);
    }

    if (options.ns) {
      output(interp.ns.toJS());
    }
  });
