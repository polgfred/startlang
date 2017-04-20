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
    rules: [
      {
        test: /\.js$/,
        use: [ 'babel-loader' ],
        exclude: [ path.resolve(__dirname, 'node_modules') ]
      }, {
        test: /\.pegjs$/,
        use: [ 'babel-loader', 'pegjs-loader' ]
      }, {
        test: /\.scss$/,
        use: [ 'style-loader', 'css-loader', 'sass-loader' ]
      }, {
        test: /\.(html|xml)$/,
        use: [ 'html-loader' ]
      }
    ]
  },
  devtool: (env == 'production') ?
              false :
              'cheap-module-source-map',
  plugins: (env == 'production') ?
              [ new webpack.optimize.UglifyJsPlugin() ] :
              []
};
