var fs = require('fs'),
    util = require('util'),
    requirejs = require('requirejs');

requirejs.config({
  baseUrl: 'js',
  nodeRequire: require
});

requirejs(['start-lang', 'start-lib'], function(startlang, startlib) {
  var ctx = startlib.createEnv(), code, prog;

  try {
    code = fs.readFileSync(process.argv[2], 'utf-8');
  } catch (e) {
    code = process.argv[2] + '\n';
  }

  try {
    prog = startlang.parse(code);
    util.puts(util.inspect(prog, false, null));
  } catch (e) {
    console.log(util.inspect(e, false, null));
    throw e;
  }

  prog.run(ctx, function() {
    console.log(util.inspect(ctx, false, null));
  });
});
