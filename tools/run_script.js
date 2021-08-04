/* eslint-disable no-console */

import { readFileSync } from 'fs';
import readline from 'readline';
import { inspect } from 'util';

import { generate } from 'peggy';

import { handle, makeInterpreter } from '../src/lang/interpreter';

const options = {},
  parserOptions = {},
  parser = generate(
    readFileSync(__dirname + '/../src/lang/parser.peggy', 'utf-8')
  ),
  output = obj => {
    console.log(inspect(obj, { colors: true, depth: null }));
  };

if (process.argv.indexOf('--ast') != -1) {
  options.ast = true;
  parserOptions.ast = true;
}

if (process.argv.indexOf('--ns') != -1) {
  options.ns = true;
}

if (process.argv.indexOf('--meta') != -1) {
  options.ast = true;
  parserOptions.ast = parserOptions.meta = true;
}

async function main() {
  let source;
  try {
    source = readFileSync(process.argv[2], 'utf-8');
  } catch (err) {
    source = process.argv[2] + '\n';
  }

  let node;
  try {
    node = parser.parse(source, parserOptions);
  } catch (err) {
    console.log(err.stack);
    process.exit();
  }

  if (options.ast) {
    output(node);
    process.exit();
  }

  const interp = makeInterpreter();

  interp.registerGlobals({
    print(...values) {
      if (values.length > 0) {
        for (let i = 0; i < values.length; ++i) {
          const v = values[i];
          console.log(handle(v).repr(v));
        }
      } else {
        console.log();
      }
    },

    input(message) {
      return new Promise(resolve => {
        const rl = readline.createInterface({
          input: process.stdin,
          output: process.stdout,
        });

        rl.question(message, answer => {
          rl.close();
          resolve(answer);
        });
      });
    },
  });

  try {
    const result = await interp.run(node);

    if (result) {
      output(result);
    }

    if (options.ns) {
      output(interp.snapshot());
    }
  } catch (err) {
    console.log(err.stack);
    output(interp.snapshot());
    process.exit();
  }
}

main();
