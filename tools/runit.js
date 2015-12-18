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

let ctx, interp;

Promise.resolve().then(() => {
  return readFileSync(process.argv[2], 'utf-8');
}).catch((err) => {
  return process.argv[2] + '\n';
}).then((source) => {
  return parse(source, parserOptions);
}).then((root) => {
  if (options.ast) {
    output(root);
    process.exit();
  }

  ctx = createRuntime();
  interp = createInterpreter(root, ctx);
  return interp.run();
}).catch((err) => {
  if (err.stack) {
    console.log(err.stack);
  }

  if (err.node) {
    output(err.node);
  }
}).then(() => {
  if (ctx && options.ns) {
    output(ctx.ns.toJS());
  }
});
