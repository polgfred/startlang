import console from 'node:console';
import process from 'node:process';
import readline from 'node:readline';
import { inspect } from 'node:util';

import { Interpreter } from '@startlang/lang-core/interpreter';
import { parse, SyntaxError } from '@startlang/lang-core/parser.peggy';
import { runtimeGlobals } from '@startlang/lang-core/runtime-globals';
import { InputSuspension } from '@startlang/lang-core/suspension';

async function runUntilComplete(interp, rl, result) {
  while (result.status === 'suspended') {
    const { suspension } = result;
    if (suspension instanceof InputSuspension) {
      rl.setPrompt(suspension.prompt);
      rl.prompt();
      return suspension;
    } else {
      throw new Error(`unsupported suspension: ${suspension.kind}`);
    }
  }
  return null;
}

async function main() {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  const promptForCommand = () => {
    rl.setPrompt('> ');
    rl.prompt();
  };
  const promptForContinuation = () => {
    rl.setPrompt('... ');
    rl.prompt();
  };

  const interp = new Interpreter();
  interp.registerGlobals(runtimeGlobals);
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
  });

  let lines = [];
  let pendingInput = null;

  promptForCommand();
  for await (const line of rl) {
    if (pendingInput) {
      try {
        const result = await interp.resumeSuspension(line);
        pendingInput = await runUntilComplete(interp, rl, result);
      } catch (err) {
        console.error(err.stack);
      }

      if (!pendingInput) {
        lines = [];
        promptForCommand();
      }
      continue;
    }

    if (line === '.exit') {
      rl.close();
      break;
    } else if (line === '.clear') {
      lines = [];
      promptForCommand();
      continue;
    } else if (line === '.dump') {
      console.log(inspect(Object.keys(interp.globalFunctions)));
      console.log(inspect(interp.globalNamespace));
      rl.prompt();
      continue;
    }

    lines.push(line);

    try {
      const node = parse(lines.join('\n') + '\n');
      pendingInput = await runUntilComplete(
        interp,
        rl,
        await interp.runIncremental(node)
      );
    } catch (err) {
      if (err instanceof SyntaxError) {
        // get more input
        promptForContinuation();
        continue;
      } else {
        console.error(err.stack);
      }
    }

    if (!pendingInput) {
      lines = [];
      promptForCommand();
    }
  }
}

main();
