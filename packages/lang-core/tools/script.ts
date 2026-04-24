import console from 'node:console';
import { readFile } from 'node:fs/promises';
import process from 'node:process';
import readline from 'node:readline';
import { inspect } from 'node:util';

import { Interpreter, type RunResult } from '@startlang/lang-core/interpreter';
import type { Node } from '@startlang/lang-core/nodes';
import { parse } from '@startlang/lang-core/parser.peggy';
import { runtimeGlobals } from '@startlang/lang-core/runtime-globals';
import { InputSuspension } from '@startlang/lang-core/suspension';
import type { RuntimeFunctions } from '@startlang/lang-core/types';

interface ScriptOptions {
  ast?: boolean;
  ns?: boolean;
}

interface ParserOptions {
  ast?: boolean;
  meta?: boolean;
}

type Question = (prompt: string) => Promise<string>;

const options: ScriptOptions = {};
const parserOptions: ParserOptions = {};
const sourceArgs: string[] = [];

function output(obj: unknown) {
  console.log(inspect(obj, { colors: true, depth: null }));
}

function createQuestioner(rl: readline.Interface): Question {
  const inputLines = rl[Symbol.asyncIterator]();

  return async (prompt) => {
    rl.setPrompt(prompt);
    rl.prompt();
    const { value, done } = await inputLines.next();
    return done ? '' : value;
  };
}

async function runUntilComplete(
  interp: Interpreter,
  question: Question,
  result: RunResult
) {
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

function isNodeError(err: unknown): err is NodeJS.ErrnoException {
  return err instanceof Error && 'code' in err;
}

function formatError(err: unknown) {
  return err instanceof Error ? err.stack : err;
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
    if (!isNodeError(err) || err.code !== 'ENOENT') {
      throw err;
    }
    source = sourceArg + '\n';
  }

  let node: Node;
  try {
    node = parse(source, parserOptions);
  } catch (err) {
    console.log(formatError(err));
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
  } satisfies RuntimeFunctions);

  try {
    await runUntilComplete(interp, question, await interp.run(node));
  } catch (err) {
    console.log(formatError(err));
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
