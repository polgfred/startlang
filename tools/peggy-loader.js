import { readFile } from 'node:fs/promises';

import peggy from 'peggy';

export async function load(url, context, nextLoad) {
  if (url.startsWith('file://') && url.endsWith('.peggy')) {
    return {
      format: 'module',
      shortCircuit: true,
      source: peggy.generate(await readFile(url.slice(7), 'utf8'), {
        output: 'source',
        format: 'es',
      }),
    };
  }

  return nextLoad(url, context);
}
