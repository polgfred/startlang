var fs = require('fs'),
    util = require('util'),
    parser = require('./parser'),
    runtime = require('./runtime'),
    interpreter = require('./interpreter');

var source, root, ctx, interp, options = {};

if (process.argv.indexOf('--meta') != -1) {
  options.meta = true;
}

try {
  source = fs.readFileSync(process.argv[2], 'utf-8');
} catch (e) {
  source = process.argv[2] + '\n';
}

try {
  root = parser.parse(source, options);
  ctx = runtime.create();
  interp = interpreter.create(root, ctx);
  util.puts(util.inspect(root, false, null));
} catch (e) {
  console.log(util.inspect(e, false, null));
  throw e;
}

interp.run(function(err, result, ctx) {
  if (err) {
    console.log('an error occurred:');
    console.log(err);
    console.log(err.stack);
  }
});
