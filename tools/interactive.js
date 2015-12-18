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
  if (line.substr(-1) == '\\') {
    buf += line.substr(0, line.length - 1) + '\n';
    rl.setPrompt('| ');
    rl.prompt();
    return;
  }

  buf += line + '\n';

  Promise.resolve().then(() => {
    return parse(buf);
  }).then((root) => {
    let interp = createInterpreter(root, ctx);
    return interp.run();
  }).catch((err) => {
    if (err.stack) {
      console.log(err.stack);
    }
  }).then((result) => {
    if (result && result.flow == 'exit') {
      process.exit();
    }

    buf = '';
    rl.setPrompt('> ');
    rl.prompt();
  });
});
