const path = require('path');
const env = process.env['NODE_ENV'];

module.exports = {
  mode: env,
  entry: './src/main.js',
  devtool: 'cheap-module-source-map',
  output: {
    path: __dirname,
    filename: '[name]-bundle.js',
  },
  module: {
    rules: [
      {
        test: /\.js$/,
        use: ['babel-loader'],
        exclude: [path.resolve(__dirname, 'node_modules')],
      },
      {
        test: /\.pegjs$/,
        use: ['babel-loader', 'pegjs-loader'],
      },
      {
        test: /\.css$/,
        use: [
          'style-loader',
          { loader: 'css-loader', options: { importLoaders: 1 } },
          'postcss-loader',
        ],
      },
      {
        test: /\.(html|xml)$/,
        use: ['html-loader'],
      },
    ],
  },
};
