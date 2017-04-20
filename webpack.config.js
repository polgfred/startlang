var path = require('path'),
    webpack = require('webpack'),
    env = process.env['NODE_ENV'];

module.exports = {
  entry: './src/main.js',
  output: {
    path: path.join(__dirname, 'dist'),
    publicPath: '/dist/',
    filename: 'bundle.js'
  },
  module: {
    loaders: [
      {
        test: /\.js$/,
        loaders: [ 'babel-loader' ],
        exclude: [ path.resolve(__dirname, 'node_modules') ]
      }, {
        test: /\.pegjs$/,
        loaders: [ 'babel-loader', 'pegjs-loader' ]
      }, {
        test: /\.scss$/,
        loaders: [ 'style-loader', 'css-loader', 'sass-loader' ]
      }, {
        test: /\.(html|xml)$/,
        loaders: [ 'html-loader' ]
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
