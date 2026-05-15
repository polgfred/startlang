import console from 'node:console';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import readline from 'node:readline';
import { inspect, parseArgs } from 'node:util';

import {
  Interpreter,
  type RunResult,
  type RuntimePause,
} from '@startlang/lang-core/interpreter';
import type { Program } from '@startlang/lang-core/program';
import { parse, type ParseOptions } from '@startlang/lang-core/parser.peggy';
import { runtimeGlobals } from '@startlang/lang-core/runtime-globals';
import type { RuntimeFunctions } from '@startlang/lang-core/types';

interface ScriptOptions {
  ast?: boolean;
  ns?: boolean;
}

type Question = (prompt: string) => Promise<string>;

function output(obj: unknown) {
  console.log(inspect(obj, { colors: true, depth: null }));
}

function usage() {
  return [
    'usage: npm run script -- [options] <file-or-source>',
    '',
    'options:',
    '  -a, --ast   print the parsed AST and exit',
    '  -m, --meta  include parser metadata in AST output',
    '  -n, --ns    print interpreter namespace after running',
    '  -h, --help  show this help',
  ].join('\n');
}

function parseCliArgs() {
  let parsed;
  try {
    parsed = parseArgs({
      options: {
        ast: { type: 'boolean', short: 'a' },
        meta: { type: 'boolean', short: 'm' },
        ns: { type: 'boolean', short: 'n' },
        help: { type: 'boolean', short: 'h' },
      },
      allowPositionals: true,
    });
  } catch (err) {
    console.error(formatMessage(err));
    console.error();
    console.error(usage());
    process.exit(1);
  }

  const { values, positionals } = parsed;

  const options: ScriptOptions = {
    ast: values.ast || values.meta,
    ns: values.ns,
  };
  const parserOptions: ParseOptions = {
    ast: values.ast || values.meta,
    meta: values.meta,
  };

  return {
    options,
    parserOptions,
    sourceArg: positionals.join(' '),
    help: values.help,
  };
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
  while (result.status === 'paused') {
    const { pause } = result;
    if (pause.kind === 'input') {
      const answer = await question(pause.prompt || '> ');
      result = await interp.continueWithInput(answer);
    } else if (isContinuablePause(pause)) {
      result = await interp.continue();
    } else {
      throw new Error(`unsupported pause: ${pause.kind}`);
    }
  }
}

function isContinuablePause(pause: RuntimePause) {
  return pause.kind === 'breakpoint' || pause.kind === 'pause';
}

function isNodeError(err: unknown): err is NodeJS.ErrnoException {
  return err instanceof Error && 'code' in err;
}

// Resolve relative source paths against the directory the user invoked
// npm from, not the workspace dir npm chdir'd into.
function resolveSourcePath(sourceArg: string): string {
  if (path.isAbsolute(sourceArg)) {
    return sourceArg;
  }
  const cwd = process.env.INIT_CWD ?? process.cwd();
  return path.resolve(cwd, sourceArg);
}

function formatError(err: unknown) {
  return err instanceof Error ? err.stack : err;
}

function formatMessage(err: unknown) {
  return err instanceof Error ? err.message : err;
}

async function main() {
  const { options, parserOptions, sourceArg, help } = parseCliArgs();

  if (help) {
    console.log(usage());
    process.exit();
  }

  if (!sourceArg) {
    console.error(usage());
    process.exit(1);
  }

  let source;
  try {
    source = await readFile(resolveSourcePath(sourceArg), 'utf-8');
  } catch (err) {
    if (!isNodeError(err) || err.code !== 'ENOENT') {
      throw err;
    }
    source = sourceArg + '\n';
  }

  let program: Program;
  try {
    program = parse(source, parserOptions);
  } catch (err) {
    console.log(formatError(err));
    process.exit();
  }

  if (options.ast) {
    output(program);
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
    await runUntilComplete(interp, question, await interp.run(program));
  } catch (err) {
    console.log(formatError(err));
  }

  if (options.ns) {
    output({
      globalNamespace: interp.globalNamespace,
      localNamespaces: interp.localNamespaces,
      lastResult: interp.lastResult,
    });
  }
  rl.close();
}

main();
