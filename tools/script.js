import console from 'node:console';
import { readFile } from 'node:fs/promises';
import process from 'node:process';
import readline from 'node:readline';
import { inspect } from 'node:util';

import { Interpreter } from '../src/lang/interpreter.js';
import { parse } from '../src/lang/parser.peggy';

const options = {};
const parserOptions = {};

function output(obj) {
  console.log(inspect(obj, { colors: true, depth: null }));
}

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
    source = await readFile(process.argv[2], 'utf-8');
  } catch (err) {
    if (err.code !== 'ENOENT') {
      throw err;
    }
    source = process.argv[2] + '\n';
  }

  let node;
  try {
    node = parse(source, parserOptions);
  } catch (err) {
    console.log(err.stack);
    process.exit();
  }

  if (options.ast) {
    output(node);
    process.exit();
  }

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  const interp = new Interpreter();
  interp.registerGlobals({
    print(interp, values) {
      if (values.length > 0) {
        for (let i = 0; i < values.length; ++i) {
          const v = values[i];
          console.log(interp.getHandler(v).getPrettyValue(v));
        }
      } else {
        console.log();
      }
    },

    input(interp, [message]) {
      return new Promise((resolve) => {
        rl.question(message, (answer) => {
          interp.setResult(answer);
          resolve();
        });
      });
    },
  });

  try {
    const result = await interp.run(node);

    if (result) {
      output(result);
    }
  } catch (err) {
    console.log(err.stack);
  }

  if (options.ns) {
    output(interp.snapshot());
  }
  rl.close();
}

main();
