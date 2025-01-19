import { EsbuildPlugin } from 'esbuild-loader';
import path from 'path';

const env = process.env['NODE_ENV'];

export default {
  mode: env,
  devtool: 'source-map',
  entry: {
    main: './src/index.jsx',
  },
  output: {
    path: path.resolve('static'),
    filename: '[name]-bundle.js',
  },
  module: {
    rules: [
      {
        test: /\.jsx?$/,
        exclude: /node_modules/,
        loader: 'esbuild-loader',
        options: {
          loader: 'jsx',
          jsx: 'automatic',
          target: 'esnext',
        },
      },
      {
        test: /\.peggy$/,
        use: [path.resolve('peggy-loader.js')],
      },
      {
        test: /\.css$/,
        use: [
          'style-loader',
          { loader: 'css-loader', options: { importLoaders: 1 } },
        ],
      },
      {
        test: /\.(html|xml)$/,
        loader: 'html-loader',
      },
      {
        test: /\.(woff(2)?|ttf|eot|svg)(\?v=\d+\.\d+\.\d+)?$/,
        loader: 'file-loader',
        options: {
          name: '[name].[ext]',
          outputPath: 'fonts/',
        },
      },
    ],
  },
  optimization:
    env === 'development'
      ? {}
      : {
          minimize: true,
          minimizer: [new EsbuildPlugin({ target: 'esnext' })],
        },
};
