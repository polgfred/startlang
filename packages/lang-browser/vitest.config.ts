import { access, readFile } from 'node:fs/promises';
import path from 'node:path';

import react from '@vitejs/plugin-react';
import peggy from 'peggy';
import { defineConfig, type Plugin } from 'vitest/config';

const rootDir = path.resolve(import.meta.dirname);
const repoDir = path.resolve(rootDir, '../..');

function extensionAliasPlugin(): Plugin {
  const extensionAliases = new Map([
    ['.js', ['.ts', '.tsx', '.js']],
    ['.jsx', ['.tsx', '.jsx']],
  ]);

  return {
    name: 'startlang-extension-alias',

    async resolveId(source, importer) {
      if (!importer || !source.startsWith('.')) {
        return null;
      }

      const extension = path.extname(source);
      const aliases = extensionAliases.get(extension);
      if (!aliases) {
        return null;
      }

      const base = path.resolve(
        path.dirname(importer),
        source.slice(0, -extension.length)
      );

      for (const alias of aliases) {
        const candidate = `${base}${alias}`;
        try {
          await access(candidate);
          return candidate;
        } catch {
          // keep trying aliases
        }
      }

      return null;
    },
  };
}

function peggyPlugin(): Plugin {
  return {
    name: 'startlang-peggy',

    async load(id) {
      if (!id.endsWith('.peggy')) {
        return null;
      }

      const grammar = await readFile(id, 'utf8');
      return peggy.generate(grammar, {
        output: 'source',
        format: 'es',
      });
    },
  };
}

export default defineConfig({
  plugins: [extensionAliasPlugin(), peggyPlugin(), react()],
  resolve: {
    alias: [
      {
        find: '@startlang/lang-core',
        replacement: path.resolve(repoDir, 'packages/lang-core/src'),
      },
      {
        find: '@startlang/lang-browser',
        replacement: path.resolve(repoDir, 'packages/lang-browser/src'),
      },
    ],
  },
  test: {
    environment: 'node',
  },
});
