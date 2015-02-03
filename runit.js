var fs = require('fs'),
    util = require('util'),
    requirejs = require('requirejs');

requirejs.config({
  baseUrl: 'js',
  nodeRequire: require
});

requirejs([ 'interpreter' ], function(interpreter) {
  var source, prog, interp;

  try {
    source = fs.readFileSync(process.argv[2], 'utf-8');
  } catch (e) {
    source = process.argv[2] + '\n';
  }

  try {
    interp = interpreter.create(source);
    util.puts(util.inspect(interp.root, false, null));
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
    console.log(util.inspect(ctx, false, null));
  });
});
