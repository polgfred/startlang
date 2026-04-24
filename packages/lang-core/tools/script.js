import console from 'node:console';
import { readFile } from 'node:fs/promises';
import process from 'node:process';
import readline from 'node:readline';
import { inspect } from 'node:util';

import { Interpreter } from '@startlang/lang-core/interpreter';
import { parse } from '@startlang/lang-core/parser.peggy';
import { runtimeGlobals } from '@startlang/lang-core/runtime-globals';
import { InputSuspension } from '@startlang/lang-core/suspension';

const options = {};
const parserOptions = {};
const sourceArgs = [];

function output(obj) {
  console.log(inspect(obj, { colors: true, depth: null }));
}

function createQuestioner(rl) {
  const inputLines = rl[Symbol.asyncIterator]();

  return async (prompt) => {
    rl.setPrompt(prompt);
    rl.prompt();
    const { value, done } = await inputLines.next();
    return done ? '' : value;
  };
}

async function runUntilComplete(interp, question, result) {
  while (result.status === 'suspended') {
    const { suspension } = result;
    if (suspension instanceof InputSuspension) {
      const answer = await question(suspension.prompt);
      result = await interp.resumeSuspension(answer);
    } else {
      throw new Error(`unsupported suspension: ${suspension.kind}`);
    }
  }
}

for (const arg of process.argv.slice(2)) {
  switch (arg) {
    case '--ast':
      options.ast = true;
      parserOptions.ast = true;
      break;
    case '--ns':
      options.ns = true;
      break;
    case '--meta':
      options.ast = true;
      parserOptions.ast = parserOptions.meta = true;
      break;
    default:
      sourceArgs.push(arg);
      break;
  }
}

async function main() {
  const sourceArg = sourceArgs.join(' ');
  if (!sourceArg) {
    console.error('usage: npm run script -- [--ast] [--meta] [--ns] <file-or-source>');
    process.exit(1);
  }

  let source;
  try {
    source = await readFile(sourceArg, 'utf-8');
  } catch (err) {
    if (err.code !== 'ENOENT') {
      throw err;
    }
    source = sourceArg + '\n';
  }

  let node;
  try {
    node = parse(source, parserOptions);
  } catch (err) {
    console.log(err.stack);
    process.exit();
  }

  if (options.ast) {
    output(node);
    process.exit();
  }

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  const question = createQuestioner(rl);

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

  try {
    await runUntilComplete(interp, question, await interp.run(node));
  } catch (err) {
    console.log(err.stack);
  }

  if (options.ns) {
    output({
      globalNamespace: interp.globalNamespace,
      topNamespace: interp.topNamespace,
      lastResult: interp.lastResult,
    });
  }
  rl.close();
}

main();
