import peggy from 'peggy';

export default function peggyLoader(grammarContent) {
  const options = this.getOptions ? this.getOptions() : {};

  return peggy.generate(grammarContent, {
    output: 'source',
    format: 'es',
    ...options,
  });
}
