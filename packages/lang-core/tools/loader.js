import { access, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

import peggy from 'peggy';

const extensionAliases = new Map([
  ['.js', ['.ts', '.tsx', '.js']],
  ['.jsx', ['.tsx', '.jsx']],
]);

export async function resolve(source, context, nextResolve) {
  if (!context.parentURL || !source.startsWith('.')) {
    return nextResolve(source, context);
  }

  const extension = path.extname(source);
  const aliases = extensionAliases.get(extension);
  if (!aliases) {
    return nextResolve(source, context);
  }

  const parentPath = fileURLToPath(context.parentURL);
  const base = path.resolve(
    path.dirname(parentPath),
    source.slice(0, -extension.length)
  );

  for (const alias of aliases) {
    const candidate = `${base}${alias}`;
    try {
      await access(candidate);
      return nextResolve(pathToFileURL(candidate).href, context);
    } catch {
      // keep trying aliases
    }
  }

  return nextResolve(source, context);
}

export async function load(url, context, nextLoad) {
  if (url.startsWith('file://') && url.endsWith('.peggy')) {
    return {
      format: 'module',
      shortCircuit: true,
      source: peggy.generate(await readFile(fileURLToPath(url), 'utf8'), {
        output: 'source',
        format: 'es',
      }),
    };
  }

  return nextLoad(url, context);
}
