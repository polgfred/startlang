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
    var root = parser.parse(line + '\n'),
        interp = interpreter.create(root, ctx);

    interp.on('error', function(err) {
      console.log('Error: ' + err.message);
      rl.prompt();
    });

    interp.on('end', function() {
      rl.prompt();
    });

    interp.run();
  } catch(err) {
    console.log('Error: ' + err.message);
    rl.prompt();
  }
});
