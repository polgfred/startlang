var fs = require('fs'),
    util = require('util'),
    parser = require('./parser'),
    runtime = require('./runtime'),
    interpreter = require('./interpreter');

var source, root, ctx, interp, options = {};

var inspectOpts = {
  colors: true,
  depth: null
};

if (process.argv.indexOf('--ast') != -1) {
  options.ast = true;
}

if (process.argv.indexOf('--ns') != -1) {
  options.ns = true;
}

if (process.argv.indexOf('--frames') != -1) {
  options.frames = true;
}

if (process.argv.indexOf('--meta') != -1) {
  options.ast = options.meta = true;
}

try {
  source = fs.readFileSync(process.argv[2], 'utf-8');
} catch (e) {
  source = process.argv[2] + '\n';
}

try {
  root = parser.parse(source, options);
  if (options.ast) {
    util.puts(util.inspect(root, inspectOpts));
    process.exit();
  }
} catch (e) {
  util.puts(util.inspect(e, inspectOpts));
  throw e;
}

try {
  ctx = runtime.create();
  interp = interpreter.create(root, ctx);
  interp.run(function(err, result, ctx) {
    if (options.ns) {
      util.puts(util.inspect(ctx.ns, inspectOpts));
    }
    if (options.frames) {
      util.puts(util.inspect(ctx.frames, inspectOpts));
    }
    if (err) {
      util.puts('an error occurred:');
      util.puts(util.inspect(err, inspectOpts));
      if (err.stack) {
        util.puts(util.inspect(err.stack, inspectOpts));
      }
    }
  });
} catch (e) {
  util.puts(util.inspect(e, inspectOpts));
  throw e;
}
