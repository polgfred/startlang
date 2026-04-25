import console from 'node:console';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import readline from 'node:readline';
import { pathToFileURL } from 'node:url';
import { inspect, parseArgs } from 'node:util';

import { Interpreter, type RunResult } from '@startlang/lang-core/interpreter';
import type { Node } from '@startlang/lang-core/nodes';
import { parse, type ParseOptions } from '@startlang/lang-core/parser.peggy';
import { runtimeGlobals } from '@startlang/lang-core/runtime-globals';
import { InputSuspension } from '@startlang/lang-core/suspension';

import {
  BrowserPresentationHost,
  browserPresentationGlobals,
} from '@startlang/lang-browser/browser';
import {
  type Cell,
  GridCell,
  GridRowCell,
  StackCell,
  ValueCell,
} from '@startlang/lang-browser/cells';

interface ScriptOptions {
  ast?: boolean;
  ns?: boolean;
}

type SuspensionQuestion = (suspension: InputSuspension) => Promise<string>;

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

function createQuestioner(
  rl: readline.Interface,
  shouldPrompt = process.stdin.isTTY
): SuspensionQuestion {
  const inputLines = rl[Symbol.asyncIterator]();

  return async (suspension) => {
    if (shouldPrompt) {
      rl.setPrompt(suspension.prompt);
      rl.prompt();
    }
    const { value, done } = await inputLines.next();
    return done ? suspension.initial : value;
  };
}

async function runUntilComplete(
  interp: Interpreter,
  host: BrowserPresentationHost,
  renderer: ConsoleOutputRenderer,
  question: SuspensionQuestion,
  result: RunResult
) {
  while (result.status === 'suspended') {
    const { suspension } = result;
    if (suspension instanceof InputSuspension) {
      renderer.flush(host);
      const answer = await question(suspension);
      result = await interp.resume(answer);
    } else {
      throw new Error(`unsupported suspension: ${suspension.kind}`);
    }
  }

  renderer.flush(host, { includeGraphics: true });
}

async function readSource(sourceArg: string) {
  const candidates = [
    sourceArg,
    path.resolve(import.meta.dirname, '../../..', sourceArg),
  ];

  for (const candidate of candidates) {
    try {
      return await readFile(candidate, 'utf-8');
    } catch (err) {
      if (!isNodeError(err) || err.code !== 'ENOENT') {
        throw err;
      }
    }
  }

  return `${sourceArg}\n`;
}

function isNodeError(err: unknown): err is NodeJS.ErrnoException {
  return err instanceof Error && 'code' in err;
}

function formatError(err: unknown) {
  return err instanceof Error ? err.stack : err;
}

function formatMessage(err: unknown) {
  return err instanceof Error ? err.message : err;
}

function renderInlineText(cell: Cell): string {
  if (cell instanceof ValueCell) {
    return cell.value;
  }

  if (cell instanceof StackCell) {
    const separator = cell.stackProps.direction === 'row' ? ' | ' : '\n';
    return cell.children.map(renderInlineText).join(separator);
  }

  if (cell instanceof GridRowCell) {
    return cell.children.map(renderInlineText).join(' | ');
  }

  if (cell instanceof GridCell) {
    return '[table]';
  }

  return '';
}

function renderStack(cell: StackCell) {
  if (cell.stackProps.direction === 'row') {
    console.table([
      Object.fromEntries(
        cell.children.map((child, index) => [
          `Column ${index + 1}`,
          renderInlineText(child),
        ])
      ),
    ]);
  } else {
    console.table(
      cell.children.map((child) => ({
        Value: renderInlineText(child),
      }))
    );
  }
}

function renderGrid(cell: GridCell) {
  const headers = cell.headers[0]?.children.map(renderInlineText) ?? [];
  const rows = cell.rows.map((row) =>
    Object.fromEntries(
      row.children.map((child, index) => [
        headers[index] ?? `Column ${index + 1}`,
        renderInlineText(child),
      ])
    )
  );

  console.table(rows);
}

function renderCell(cell: Cell) {
  if (cell instanceof ValueCell) {
    console.log(cell.value);
  } else if (cell instanceof StackCell) {
    renderStack(cell);
  } else if (cell instanceof GridCell) {
    renderGrid(cell);
  } else if (cell instanceof GridRowCell) {
    console.log(renderInlineText(cell));
  }
}

interface FlushOptions {
  includeGraphics?: boolean;
}

class ConsoleOutputRenderer {
  private renderedCellCount = 0;
  private renderedShapeCount = 0;

  flush(host: BrowserPresentationHost, options: FlushOptions = {}) {
    const newCells = host.outputBuffer.children.slice(this.renderedCellCount);
    for (const cell of newCells) {
      renderCell(cell);
    }
    this.renderedCellCount = host.outputBuffer.children.length;

    if (options.includeGraphics) {
      this.flushGraphics(host);
    }
  }

  private flushGraphics(host: BrowserPresentationHost) {
    const newShapes = host.shapes.slice(this.renderedShapeCount);
    if (newShapes.length === 0) {
      return;
    }

    const counts = new Map<string, number>();
    for (const shape of newShapes) {
      const name = shape.constructor.name.toLowerCase();
      counts.set(name, (counts.get(name) ?? 0) + 1);
    }

    console.log();
    console.log('Graphics output:');
    for (const [name, count] of counts) {
      console.log(`  ${name}: ${count}`);
    }

    this.renderedShapeCount = host.shapes.length;
  }
}

export function renderConsoleOutput(host: BrowserPresentationHost) {
  new ConsoleOutputRenderer().flush(host, { includeGraphics: true });
}

export async function main() {
  const { options, parserOptions, sourceArg, help } = parseCliArgs();

  if (help) {
    console.log(usage());
    process.exit();
  }

  if (!sourceArg) {
    console.error(usage());
    process.exit(1);
  }

  const source = await readSource(sourceArg);

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

  const host = new BrowserPresentationHost();
  const renderer = new ConsoleOutputRenderer();
  const interp = new Interpreter(host);
  interp.registerGlobals(runtimeGlobals);
  interp.registerGlobals(browserPresentationGlobals);

  try {
    await runUntilComplete(
      interp,
      host,
      renderer,
      question,
      await interp.run(node)
    );
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

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  await main();
}
