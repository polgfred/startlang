import console from 'node:console';
import process from 'node:process';
import readline from 'node:readline';
import { inspect } from 'node:util';

import {
  Interpreter,
  type RunResult,
  type RuntimePause,
} from '@startlang/lang-core/interpreter';
import { parse, SyntaxError } from '@startlang/lang-core/parser.peggy';
import { runtimeGlobals } from '@startlang/lang-core/runtime-globals';
import type { RuntimeFunctions } from '@startlang/lang-core/types';

async function runUntilComplete(
  interp: Interpreter,
  rl: readline.Interface,
  result: RunResult
) {
  while (result.status === 'paused') {
    const { pause } = result;
    if (pause.kind === 'input') {
      rl.setPrompt(pause.prompt || '> ');
      rl.prompt();
      return pause;
    } else if (pause.kind === 'breakpoint' || pause.kind === 'pause') {
      result = await interp.continue();
    } else {
      throw new Error(`unsupported pause: ${pause.kind}`);
    }
  }
  return null;
}

function formatError(err: unknown) {
  return err instanceof Error ? err.stack : err;
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
  } satisfies RuntimeFunctions);

  let lines: string[] = [];
  let pendingInput: RuntimePause | null = null;

  promptForCommand();
  for await (const line of rl) {
    if (pendingInput) {
      try {
        const result = await interp.continueWithInput(line);
        pendingInput = await runUntilComplete(interp, rl, result);
      } catch (err) {
        console.error(formatError(err));
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
        console.error(formatError(err));
      }
    }

    if (!pendingInput) {
      lines = [];
      promptForCommand();
    }
  }
}

main();
