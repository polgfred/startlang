const { getOptions } = require('loader-utils');
const { generate } = require('peggy');

module.exports = function peggyLoader(grammarContent) {
  return generate(grammarContent, {
    output: 'source',
    format: 'commonjs',
    ...getOptions(this),
  });
};
