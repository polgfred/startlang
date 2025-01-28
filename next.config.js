import path from 'node:path';

import { withPigment } from '@pigment-css/nextjs-plugin';
import { createTheme } from '@mui/material';

export default withPigment(
  {
    output: 'standalone',
    webpack(config) {
      config.module.rules.push(
        {
          test: /\.peggy$/,
          use: [path.resolve('peggy-loader.js')],
        },
        {
          test: /\.xml$/,
          loader: 'html-loader',
        },
        {
          test: /\.start$/,
          loader: 'text-loader',
        }
      );
      return config;
    },
  },
  {
    transformLibraries: ['@mui/material'],
    theme: createTheme({
      palette: {
        primary: {
          main: '#6b9da0',
        },
        secondary: {
          main: '#ffffff',
        },
      },
    }),
  }
);
