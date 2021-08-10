/* eslint-disable no-console */

import { readFileSync } from 'fs';
import { inspect } from 'util';

import { generate } from 'peggy';

const options = {},
  parserOptions = {},
  parser = generate(
    readFileSync(__dirname + '/../src/lang/lua.peggy', 'utf-8')
  ),
  output = (obj) => {
    console.log(inspect(obj, { colors: true, depth: null }));
  };

if (process.argv.indexOf('--ast') !== -1) {
  options.ast = true;
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
    console.log(inspect(err, { colors: true, depth: Infinity }));
    // console.log(err.stack);
    process.exit();
  }

  if (options.ast) {
    output(node);
    process.exit();
  }
}

main();
