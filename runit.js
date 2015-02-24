var fs = require('fs'),
    util = require('util'),
    parser = require('./parser'),
    runtime = require('./runtime'),
    interpreter = require('./interpreter');

var options = {}, parserOptions = {};

var inspectOpts = {
  colors: true,
  depth: null
};

function output(obj) {
  console.log(util.inspect(obj, inspectOpts));
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

if (process.argv.indexOf('--repl') != -1) {
  options.repl = true;
}

try {
  source = fs.readFileSync(process.argv[2], 'utf-8');
} catch (e) {
  source = process.argv[2] + '\n';
}

try {
  root = parser.parse(source, parserOptions);
  if (options.ast) {
    output(root);
    process.exit();
  }
} catch (e) {
  output(e);
  throw e;
}

try {
  ctx = runtime.create();
  interp = interpreter.create(root, ctx);
  interp.run();
  interp.end = function(node, err) {
    if (options.ns) {
      output(ctx.ns);
    }
    if (options.frames) {
      output(interp.frames);
    }
    if (err) {
      output('an error occurred:');
      output(err);
      if (err.stack) {
        output(err.stack);
      }
    }

    if (options.repl) {
      console.log('\n You have `source`, `root`, `ctx`, and `interp`.\n');
      require('repl').start({
        prompt: '> ',
        useGlobal: true,
        writer: function(obj) {
          return util.inspect(obj, { colors: true, depth: null });
        }
      });
    }
  };
} catch (e) {
  output(e);
  throw e;
}
