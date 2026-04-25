import { readFile } from 'node:fs/promises';

import peggy from 'peggy';
import { defineConfig, type Plugin } from 'vitest/config';

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
  plugins: [peggyPlugin()],
  test: {
    environment: 'node',
  },
});
