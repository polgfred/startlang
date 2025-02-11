/* eslint-disable no-console */

import console from 'node:console';
import process from 'node:process';
import readline from 'node:readline';
import { inspect } from 'node:util';

import { Interpreter } from '../src/lang/interpreter';
import { parse, SyntaxError } from '../src/lang/parser.peggy';

async function main() {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  const interp = new Interpreter();
  interp.registerGlobals({
    print(interp, values) {
      if (values.length > 0) {
        for (let i = 0; i < values.length; ++i) {
          const v = values[i];
          console.log(interp.getHandler(v).getPrettyValue(v));
        }
      } else {
        console.log();
      }
    },

    input(message) {
      return new Promise((resolve) => {
        const rl = readline.createInterface({
          input: process.stdin,
          output: process.stdout,
        });

        rl.question(message, (answer) => {
          rl.close();
          resolve(answer);
        });
      });
    },
  });

  let lines = [];

  rl.on('line', async (line) => {
    if (line === '.exit') {
      rl.close();
      process.exit();
    } else if (line === '.dump') {
      const snap = interp.snapshot();
      console.log(inspect(Object.keys(snap.gfn)));
      console.log(inspect(snap.gns));
      rl.prompt();
      return;
    }

    lines.push(line);

    try {
      const node = parse(lines.join('\n') + '\n');
      await interp.run(node);
    } catch (err) {
      if (err instanceof SyntaxError) {
        // get more input
        rl.setPrompt('... ');
        rl.prompt();
        return;
      } else {
        console.error(err.stack);
      }
    }

    lines = [];
    rl.setPrompt('> ');
    rl.prompt();
  });

  rl.setPrompt('> ');
  rl.prompt();
}

main();
