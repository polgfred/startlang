import { getOptions } from 'loader-utils';
import peggy from 'peggy';

export default function peggyLoader(grammarContent) {
  return peggy.generate(grammarContent, {
    output: 'source',
    format: 'es',
    ...getOptions(this),
  });
};
