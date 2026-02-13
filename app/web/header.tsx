import { AppBar, Button, Toolbar, Typography } from '@mui/material';
import { editor } from 'monaco-editor';
import Image from 'next/image';
import Link from 'next/link';
import { RefObject } from 'react';

import type { ViewMode } from '../../src/desktop/types.js';
import { CodeMenu, ViewMenu } from '../common/header-shared.jsx';

export default function HeaderWeb({
  viewMode,
  setViewMode,
  isRunning,
  showInspector,
  setShowInspector,
  runProgram,
  editorRef,
}: {
  viewMode: ViewMode;
  setViewMode: (mode: ViewMode) => void;
  isRunning: boolean;
  showInspector: boolean;
  setShowInspector: (value: boolean) => void;
  runProgram: () => void | Promise<void>;
  editorRef: RefObject<editor.ICodeEditor | null>;
}) {
  return (
    <AppBar
      position="static"
      sx={{
        flexDirection: 'row',
        justifyContent: 'space-between',
      }}
    >
      <Toolbar
        sx={{
          gap: 1,
        }}
      >
        <Typography
          variant="body1"
          sx={{
            marginRight: 2,
          }}
        >
          START
        </Typography>
        <ViewMenu
          viewMode={viewMode}
          setViewMode={setViewMode}
          showInspector={showInspector}
          setShowInspector={setShowInspector}
        />
        <CodeMenu editorRef={editorRef} runProgram={runProgram} />
        <Button
          variant="contained"
          disabled={isRunning}
          onClick={runProgram}
          sx={{
            marginLeft: 2,
            backgroundColor: '#dddddd',
            color: '#222222',
          }}
        >
          Run
        </Button>
      </Toolbar>
      <Toolbar
        sx={{
          gap: 1,
        }}
      >
        <Link href="https://linkedin.com/in/polgfred" target="_blank">
          <Image src="/linkedin-logo.svg" alt="logo" width="32" height="32" />
        </Link>
        <Link href="https://github.com/polgfred/startlang" target="_blank">
          <Image src="/github-logo.svg" alt="logo" width="32" height="32" />
        </Link>
      </Toolbar>
    </AppBar>
  );
}
