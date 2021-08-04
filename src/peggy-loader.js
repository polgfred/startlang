import { getOptions } from 'loader-utils';
import { generate } from 'peggy';

export default function peggyLoader(grammarContent) {
  return generate(grammarContent, {
    output: 'source',
    format: 'commonjs',
    ...getOptions(this),
  });
}
