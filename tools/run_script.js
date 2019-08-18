/* eslint-disable no-console */

import readline from 'readline';

import { readFileSync } from 'fs';
import { inspect } from 'util';

import PEG from 'pegjs';

import { SRuntime } from '../src/lang/runtime';
import { SInterpreter } from '../src/lang/interpreter';

let interp,
  start,
  end,
  options = {},
  parserOptions = {},
  parser = PEG.generate(
    readFileSync(__dirname + '/../src/lang/parser.pegjs', 'utf-8')
  ),
  output = obj => console.log(inspect(obj, { colors: true, depth: null })),
  app = {
    snapshot() {
      output({
        fn: interp.fn,
        ns: interp.ns,
        st: interp.st,
        frame: interp.frame,
        fst: interp.fst,
      });
    },

    output(value) {
      console.log(value);
    },

    input(message) {
      return new Promise(resolve => {
        let rl = readline.createInterface({
          input: process.stdin,
          output: process.stdout,
        });

        rl.question(message, answer => {
          rl.close();
          resolve(answer);
        });
      });
    },
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

Promise.resolve()
  .then(() => readFileSync(process.argv[2], 'utf-8'))
  .catch(() => process.argv[2] + '\n')
  .then(source => parser.parse(source, parserOptions))
  .then(root => {
    if (options.ast) {
      output(root);
      process.exit();
    }

    interp = new SInterpreter(app);
    interp.ctx = new SRuntime(app);
    interp.root(root);

    if (options.time) {
      start = new Date();
      console.error('start', start);
    }

    return interp.run();
  })
  .catch(err => {
    if (err.stack) {
      console.log(err.stack);
    }

    if (interp.frame) {
      output(interp.frame.node);
    }
  })
  .then(() => {
    if (options.time) {
      end = new Date();
      console.error('end', end);
      console.error('time (ms)', end - start);
    }

    if (options.ns) {
      output(interp.ns.toJS());
    }
  });
