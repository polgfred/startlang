import { default as readline } from 'readline';

import { inspect } from 'util';
import { parse } from '../lang/parser';
import { createRuntime } from '../lang/runtime';
import { createInterpreter } from '../lang/interpreter';

let ctx = createRuntime();

let rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

let buf = '';
rl.setPrompt('> ');
rl.prompt();

rl.on('line', (line) => {
  try {
    if (line.substr(-1) == '\\') {
      buf += line.substr(0, line.length-1) + '\n';
      rl.setPrompt('| ');
      rl.prompt();
      return;
    }

    buf += line + '\n';

    let root = parse(buf),
        interp = createInterpreter(root, ctx);

    interp.on('error', (err) => {
      console.log('Error: ' + err.message);

      buf = '';
      rl.setPrompt('> ');
      rl.prompt();
    });

    interp.on('end', () => {
      buf = '';
      rl.setPrompt('> ');
      rl.prompt();
    });

    interp.run();
  } catch(err) {
    console.log('Error: ' + err.message);

    buf = '';
    rl.setPrompt('> ');
    rl.prompt();
  }
});
