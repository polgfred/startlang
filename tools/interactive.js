import { default as readline } from 'readline';

import { inspect } from 'util';
import { parse } from '../parser';
import { createRuntime } from '../runtime';
import { createInterpreter } from '../interpreter';

function output(obj) {
  console.log(inspect(obj, { colors: true, depth: null }));
}

var ctx = createRuntime();

var rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

rl.setPrompt('> ');
rl.prompt();

rl.on('line', function(line) {
  try {
    var root = parse(line + '\n'),
        interp = createInterpreter(root, ctx);

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
