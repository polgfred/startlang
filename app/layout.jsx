import '@mui/material-pigment-css/styles.css';
import { Analytics } from '@vercel/analytics/next';

import '@mui/material-pigment-css/styles.css';
import './layout.css';

export const metadata = {
  title: 'Home',
};

export default function RootLayout({ children }) {
  return (
    <html
      sx={{
        fontSize: 14,
        height: '100%',
      }}
      lang="en"
    >
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </head>
      <body
        sx={{
          background: '#ccc',
          height: '100%',
          margin: 0,
          padding: 0,
          fontFamily: 'Roboto',
          fontWeight: 400,
        }}
      >
        {children}
        <Analytics />
      </body>
    </html>
  );
}
