#!/usr/bin/env babel-node

'use strict';

import readline from 'readline';

import { readFileSync } from 'fs';
import { inspect } from 'util';
import { transform } from 'babel-core';

import PEG from 'pegjs';

import { SRuntime } from '../src/lang/runtime';
import { SInterpreter } from '../src/lang/interpreter';

let parser = (() => {
  // build the parser the hard way, we'll cache this later
  let peg = readFileSync(__dirname + '/../src/lang/parser.pegjs', 'utf-8');
  let js = PEG.generate(peg, { output: 'source' });

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

let app = {
  output(value) {
    console.log(value);
  },

  input(message) {
    return new Promise((resolve) => {
      let rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
      });

      rl.question(message, (answer) => {
        rl.close();
        resolve(answer);
      });
    });
  }
}

Promise.resolve()
  .then(() => readFileSync(process.argv[2], 'utf-8'))
  .catch((err) => process.argv[2] + '\n')
  .then((source) => parser.parse(source, parserOptions))
  .then((root) => {
    if (options.ast) {
      output(root);
      process.exit();
    }

    interp = new SInterpreter(app);
    interp.ctx = new SRuntime(app);
    interp.root(root);

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
