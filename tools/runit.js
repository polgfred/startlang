import { readFileSync } from 'fs';
import { inspect } from 'util';
import { parse } from '../lang/parser';
import { createRuntime } from '../lang/runtime';
import { createInterpreter } from '../lang/interpreter';

let options = {}, parserOptions = {};

let inspectOpts = {
  colors: true,
  depth: null
};

function output(obj) {
  console.log(inspect(obj, inspectOpts));
}

if (process.argv.indexOf('--ast') != -1) {
  options.ast = true;
  parserOptions.ast = true;
}

if (process.argv.indexOf('--ns') != -1) {
  options.ns = true;
}

if (process.argv.indexOf('--frames') != -1) {
  options.frames = true;
}

if (process.argv.indexOf('--meta') != -1) {
  options.ast = true;
  parserOptions.ast = parserOptions.meta = true;
}

let source, root;

try {
  source = readFileSync(process.argv[2], 'utf-8');
} catch (err) {
  source = process.argv[2] + '\n';
}

try {
  root = parse(source, parserOptions);
} catch (err) {
  console.log('an error occurred:', err.message);
  process.exit();
}

if (options.ast) {
  output(root);
  process.exit();
}

let ctx = createRuntime(),
    interp = createInterpreter(root, ctx);

interp.run().then(() => {
  if (options.ns) {
    output(ctx.ns.toJS());
  }
}, (err) => {
  if (options.ns) {
    output(ctx.ns.toJS());
  }

  console.log('an error occurred:', err.message);
  output(err.node);

  if (err.stack) {
    console.log(err.stack);
  }
});
