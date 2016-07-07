var path = require('path');

module.exports = {
  entry: './src/main.js',
  output: {
    path: path.join(__dirname, 'dist'),
    filename: 'bundle.js'
  },
  devtool: 'inline-source-map',
  module: {
    loaders: [
      {
        exclude: [
          path.resolve(__dirname, 'node_modules')
        ],
        test: /\.js$/,
        loaders: [ 'babel' ]
      }, {
        test: /\.pegjs$/,
        loaders: [ 'pegjs' ]
      }, {
        test: /\.scss$/,
        loaders: [ 'style', 'css', 'sass' ]
      }
    ]
  }
};
