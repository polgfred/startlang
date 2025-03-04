'use client';

import { type ReactNode } from 'react';

import EnvironmentProvider from './environment';
import { EditorProvider } from './monaco';

export default function Providers({ children }: { children: ReactNode }) {
  return (
    <EditorProvider>
      <EnvironmentProvider>{children}</EnvironmentProvider>
    </EditorProvider>
  );
}
