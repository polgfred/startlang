import {
  AppBar,
  Button,
  Divider,
  Menu,
  MenuItem,
  Toolbar,
  Typography,
} from '@mui/material';
import { editor } from 'monaco-editor';
import Image from 'next/image';
import Link from 'next/link';
import { MouseEvent, RefObject, useCallback, useState } from 'react';

import type { ViewMode } from '../../src/desktop/types.js';
import { CodeMenu, ViewMenu } from '../common/header-shared.jsx';

function useMenu() {
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);

  const openMenu = useCallback(
    (ev: MouseEvent<HTMLButtonElement>) => {
      setAnchor(ev.currentTarget);
    },
    [setAnchor]
  );

  const closeMenu = useCallback(() => {
    setAnchor(null);
  }, [setAnchor]);

  return { anchor, openMenu, closeMenu };
}

function FileMenu({
  currentFilePath,
  recentFiles,
  openFile,
  openRecentFile,
  saveFile,
  saveFileAs,
  exportTrace,
}: {
  currentFilePath: string | null;
  recentFiles: readonly string[];
  openFile: () => void;
  openRecentFile: (filePath: string) => void;
  saveFile: () => void;
  saveFileAs: () => void;
  exportTrace: () => void;
}) {
  const { anchor, openMenu, closeMenu } = useMenu();

  return (
    <>
      <Button variant="text" color="secondary" onClick={openMenu}>
        File
      </Button>
      <Menu open={anchor !== null} anchorEl={anchor} onClose={closeMenu}>
        <MenuItem
          onClick={() => {
            openFile();
            closeMenu();
          }}
        >
          Open
        </MenuItem>
        <MenuItem
          disabled={!currentFilePath}
          onClick={() => {
            saveFile();
            closeMenu();
          }}
        >
          Save
        </MenuItem>
        <MenuItem
          onClick={() => {
            saveFileAs();
            closeMenu();
          }}
        >
          Save As
        </MenuItem>
        <MenuItem
          onClick={() => {
            exportTrace();
            closeMenu();
          }}
        >
          Export Trace
        </MenuItem>
        {recentFiles.length > 0 && <Divider />}
        {recentFiles.map((path) => (
          <MenuItem
            key={path}
            onClick={() => {
              openRecentFile(path);
              closeMenu();
            }}
          >
            {path}
          </MenuItem>
        ))}
      </Menu>
    </>
  );
}

export default function HeaderDesktop({
  viewMode,
  setViewMode,
  isRunning,
  currentFilePath,
  recentFiles,
  openFile,
  openRecentFile,
  saveFile,
  saveFileAs,
  exportTrace,
  showInspector,
  setShowInspector,
  runProgram,
  editorRef,
}: {
  viewMode: ViewMode;
  setViewMode: (mode: ViewMode) => void;
  isRunning: boolean;
  currentFilePath: string | null;
  recentFiles: readonly string[];
  openFile: () => void;
  openRecentFile: (filePath: string) => void;
  saveFile: () => void;
  saveFileAs: () => void;
  exportTrace: () => void;
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
        <FileMenu
          currentFilePath={currentFilePath}
          recentFiles={recentFiles}
          openFile={openFile}
          openRecentFile={openRecentFile}
          saveFile={saveFile}
          saveFileAs={saveFileAs}
          exportTrace={exportTrace}
        />
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
        {currentFilePath && (
          <Typography
            variant="body2"
            sx={{
              marginRight: 2,
            }}
          >
            {currentFilePath}
          </Typography>
        )}
        {recentFiles.length > 0 && (
          <Button
            variant="text"
            color="secondary"
            onClick={() => {
              openRecentFile(recentFiles[0]);
            }}
          >
            Reopen Last
          </Button>
        )}
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
