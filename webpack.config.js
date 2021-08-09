const path = require('path');

const TerserPlugin = require('terser-webpack-plugin');

const env = process.env['NODE_ENV'];

module.exports = {
  mode: env,
  devtool: 'source-map',
  output: {
    path: __dirname + '/static',
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
        test: /\.peggy$/,
        use: ['babel-loader', path.resolve(__dirname, 'src/peggy-loader.js')],
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
      {
        test: /\.(woff(2)?|ttf|eot|svg)(\?v=\d+\.\d+\.\d+)?$/,
        use: [
          {
            loader: 'file-loader',
            options: {
              name: '[name].[ext]',
              outputPath: 'fonts/',
            },
          },
        ],
      },
    ],
  },
  optimization:
    env === 'development'
      ? {}
      : {
          minimize: true,
          minimizer: [new TerserPlugin({ extractComments: false })],
        },
};
