import {
  AppBar,
  Button,
  Divider,
  Menu,
  MenuItem,
  Toolbar,
  Typography,
} from '@mui/material';
import { editor as ed } from 'monaco-editor';
import Image from 'next/image';
import Link from 'next/link';
import { MouseEvent, RefObject, useCallback, useState } from 'react';

import boxScript from '../tests/box.start';
import investScript from '../tests/invest.start';
import layoutScript from '../tests/layout.start';
import numguessScript from '../tests/numguess.start';
import sieveScript from '../tests/sieve.start';
import sineScript from '../tests/sine.start';
import victorScript from '../tests/victor.start';

import { useEnvironment } from './environment';

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

function ViewMenu({
  showInspector,
  setShowInspector,
}: {
  showInspector: boolean;
  setShowInspector: (value: boolean) => void;
}) {
  const { host } = useEnvironment();

  const { anchor, openMenu, closeMenu } = useMenu();

  return (
    <>
      <Button variant="text" color="secondary" onClick={openMenu}>
        View
      </Button>
      <Menu open={anchor !== null} anchorEl={anchor} onClose={closeMenu}>
        <MenuItem
          selected={host.viewMode === 'graphics'}
          onClick={() => {
            host.setViewMode('graphics');
            closeMenu();
          }}
        >
          Graphics
        </MenuItem>
        <MenuItem
          selected={host.viewMode === 'text'}
          onClick={() => {
            host.setViewMode('text');
            closeMenu();
          }}
        >
          Text
        </MenuItem>
        <Divider />
        <MenuItem
          selected={showInspector}
          onClick={() => {
            setShowInspector(!showInspector);
            closeMenu();
          }}
        >
          Inspector
        </MenuItem>
      </Menu>
    </>
  );
}

const exampleScripts = [
  {
    name: 'Stacking Boxes',
    script: boxScript,
  },
  {
    name: 'Compound Interest Calculator',
    script: investScript,
  },
  {
    name: 'Number Guessing Game',
    script: numguessScript,
  },
  {
    name: 'Sieve of Eratosthenes',
    script: sieveScript,
  },
  {
    name: 'Sine Curve Plot',
    script: sineScript,
  },
  {
    name: 'Victor Wireframe Plot',
    script: victorScript,
  },
  {
    name: 'Nested Data Layout',
    script: layoutScript,
  },
];

function CodeMenu({
  editorRef,
}: {
  editorRef: RefObject<ed.ICodeEditor | null>;
}) {
  const { anchor, openMenu, closeMenu } = useMenu();

  const { runProgram } = useEnvironment();

  const loadScript = useCallback(
    (script: string) => {
      if (editorRef.current) {
        editorRef.current.setValue(script);
        closeMenu();
        runProgram();
      }
    },
    [closeMenu, editorRef, runProgram]
  );

  return (
    <>
      <Button variant="text" color="secondary" onClick={openMenu}>
        Examples
      </Button>
      <Menu open={anchor !== null} anchorEl={anchor} onClose={closeMenu}>
        {exampleScripts.map(({ name, script }) => (
          <MenuItem
            key={name}
            onClick={() => {
              loadScript(script);
            }}
          >
            {name}
          </MenuItem>
        ))}
        <Divider />
        <MenuItem
          onClick={() => {
            if (editorRef.current) {
              editorRef.current.setValue('');
              closeMenu();
            }
          }}
        >
          New
        </MenuItem>
      </Menu>
    </>
  );
}

export default function Header({
  showInspector,
  setShowInspector,
  editorRef,
}: {
  showInspector: boolean;
  setShowInspector: (value: boolean) => void;
  editorRef: RefObject<ed.ICodeEditor | null>;
}) {
  const { interpreter, runProgram } = useEnvironment();

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
          showInspector={showInspector}
          setShowInspector={setShowInspector}
        />
        <CodeMenu editorRef={editorRef} />
        {interpreter.isRunning ? (
          <>
            <Button
              variant="contained"
              sx={{
                marginLeft: 2,
                backgroundColor: '#dddddd',
                color: '#222222',
              }}
            >
              Stop
            </Button>
            <Button
              variant="contained"
              onClick={() => {
                interpreter.runLoop();
              }}
              sx={{
                marginLeft: 2,
                backgroundColor: '#dddddd',
                color: '#222222',
              }}
            >
              Continue
            </Button>
          </>
        ) : (
          <Button
            variant="contained"
            onClick={runProgram}
            sx={{
              marginLeft: 2,
              backgroundColor: '#dddddd',
              color: '#222222',
            }}
          >
            Run
          </Button>
        )}
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
