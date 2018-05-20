let path = require('path'),
    webpack = require('webpack'),
    env = process.env['NODE_ENV'];

module.exports = {
  mode: env,
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
        test: /\.css$/,
        use: [
          'style-loader',
          { loader: 'css-loader', options: { importLoaders: 1 } },
          'postcss-loader'
        ]
      }, {
        test: /\.(html|xml)$/,
        use: [ 'html-loader' ]
      }
    ]
  }
};
