var fs = require('fs'),
    util = require('util'),
    readline = require('readline'),
    parser = require('./parser'),
    runtime = require('./runtime'),
    interpreter = require('./interpreter');

function output(obj) {
  console.log(util.inspect(obj, { colors: true, depth: null }));
}

var ctx = runtime.create();

var rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

rl.setPrompt('> ');
rl.prompt();

rl.on('line', function(line) {
  try {
    var root = parser.parse(line + '\n');
    var interp = interpreter.create(root, ctx);
    interp.end = function(err) {
      if (err) {
        output(err.node);
        console.log(err.stack);
      }
      rl.prompt();
    }
    interp.run();
  } catch(err) {
    console.log(err.message);
    rl.prompt();
  }
});
