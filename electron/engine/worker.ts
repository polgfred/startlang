import { parentPort } from 'node:worker_threads';

import { BrowserHost, browserGlobals } from '../../src/lang/ext/browser.js';
import { serializeCurrentState, serializeTraceBundle } from '../../src/desktop/serialize.js';
import { Interpreter } from '../../src/lang/interpreter.js';
import { parse } from '../../src/lang/parser.peggy';
import type {
  EngineErrorState,
  EngineRunResult,
} from '../../src/desktop/types.js';

interface RequestMessage {
  id: number;
  type: 'run' | 'moveToSnapshot' | 'exportTrace';
  payload?: unknown;
}

interface SuccessResponse {
  id: number;
  ok: true;
  result: unknown;
}

interface ErrorResponse {
  id: number;
  ok: false;
  error: string;
}

const host = new BrowserHost();
const interpreter = new Interpreter(host);
let lastSource = '';

interpreter.registerGlobals(browserGlobals);
interpreter.registerGlobals({
  input() {
    throw new Error('input() is not supported in worker mode yet');
  },
});

function formatError(error: unknown): EngineErrorState {
  if (error instanceof Error) {
    return {
      message: error.message,
      stack: error.stack,
    };
  }
  return {
    message: String(error),
  };
}

async function runProgram(source: string): Promise<EngineRunResult> {
  lastSource = source;
  interpreter.clearHistory();
  host.clearDisplay();
  host.clearOutputBuffer();
  host.restoreOriginalSettings();
  let errorState: EngineErrorState | null = null;
  try {
    const rootNode = parse(`${source}\n`);
    await interpreter.run(rootNode);
  } catch (error: unknown) {
    errorState = formatError(error);
  }
  return {
    state: serializeCurrentState(interpreter, host),
    error: errorState,
  };
}

function moveToSnapshot(index: number): EngineRunResult {
  let errorState: EngineErrorState | null = null;
  try {
    interpreter.moveToSnapshot(index);
  } catch (error: unknown) {
    errorState = formatError(error);
  }
  return {
    state: serializeCurrentState(interpreter, host),
    error: errorState,
  };
}

function exportTrace() {
  return serializeTraceBundle(lastSource, interpreter);
}

async function handleMessage(message: RequestMessage): Promise<unknown> {
  switch (message.type) {
    case 'run':
      return runProgram((message.payload as { source: string }).source);
    case 'moveToSnapshot':
      return moveToSnapshot((message.payload as { index: number }).index);
    case 'exportTrace':
      return exportTrace();
    default:
      throw new Error(`unknown worker message type: ${message.type}`);
  }
}

parentPort?.on('message', async (message: RequestMessage) => {
  try {
    const result = await handleMessage(message);
    const response: SuccessResponse = {
      id: message.id,
      ok: true,
      result,
    };
    parentPort?.postMessage(response);
  } catch (error: unknown) {
    const response: ErrorResponse = {
      id: message.id,
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    };
    parentPort?.postMessage(response);
  }
});
