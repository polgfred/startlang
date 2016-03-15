Package.describe({
  name: 'polgfred:pegjs',
  version: '0.9.0',
  summary: 'PEG.js compiler'
});

Package.registerBuildPlugin({
  name: 'pegjs',
  use: ['ecmascript'],
  sources: ['compiler.js'],
  npmDependencies: {
    'pegjs': '0.9.0'
  }
});
