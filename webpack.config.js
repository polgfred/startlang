var path = require('path'),
    webpack = require('webpack'),
    env = process.env['NODE_ENV'];

module.exports = {
  entry: './src/main.js',
  output: {
    path: path.join(__dirname, 'dist'),
    filename: 'bundle.js'
  },
  module: {
    loaders: [
      {
        test: /\.js$/,
        loaders: [ 'babel' ],
        exclude: [ path.resolve(__dirname, 'node_modules') ]
      }, {
        test: /\.pegjs$/,
        loaders: [ 'babel', 'pegjs' ]
      }, {
        test: /\.scss$/,
        loaders: [ 'style', 'css', 'sass' ]
      }
    ]
  },
  devtool: (env == 'production') ?
              null :
              'cheap-module-source-map',
  plugins: (env == 'production') ?
              [ new webpack.optimize.UglifyJsPlugin() ] :
              []
};
