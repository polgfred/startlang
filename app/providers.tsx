'use client';

import { type ReactNode } from 'react';

import EnvironmentProvider from './environment.jsx';
import { EditorProvider } from './monaco.jsx';

export default function Providers({ children }: { children: ReactNode }) {
  return (
    <EditorProvider>
      <EnvironmentProvider>{children}</EnvironmentProvider>
    </EditorProvider>
  );
}
