import {
  AppBar,
  Button,
  Divider,
  Menu,
  MenuItem,
  Toolbar,
  Typography,
} from '@mui/material';
import Image from 'next/image';
import Link from 'next/link';
import { MouseEvent, useCallback, useState } from 'react';

import boxScript from '../tests/box.start';
import investScript from '../tests/invest.start';
import layoutScript from '../tests/layout.start';
import numguessScript from '../tests/numguess.start';
import sieveScript from '../tests/sieve.start';
import sineScript from '../tests/sine.start';
import victorScript from '../tests/victor.start';

import { useEnvironment } from './environment.jsx';

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
    source: boxScript,
  },
  {
    name: 'Compound Interest Calculator',
    source: investScript,
  },
  {
    name: 'Number Guessing Game',
    source: numguessScript,
  },
  {
    name: 'Sieve of Eratosthenes',
    source: sieveScript,
  },
  {
    name: 'Sine Curve Plot',
    source: sineScript,
  },
  {
    name: 'Victor Wireframe Plot',
    source: victorScript,
  },
  {
    name: 'Nested Data Layout',
    source: layoutScript,
  },
];

function CodeMenu() {
  const { anchor, openMenu, closeMenu } = useMenu();

  const { loadProgram } = useEnvironment();

  return (
    <>
      <Button variant="text" color="secondary" onClick={openMenu}>
        Examples
      </Button>
      <Menu open={anchor !== null} anchorEl={anchor} onClose={closeMenu}>
        {exampleScripts.map(({ name, source }) => (
          <MenuItem
            key={name}
            onClick={() => {
              closeMenu();
              loadProgram(source);
            }}
          >
            {name}
          </MenuItem>
        ))}
        <Divider />
        <MenuItem
          onClick={() => {
            closeMenu();
            loadProgram(null);
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
}: {
  showInspector: boolean;
  setShowInspector: (value: boolean) => void;
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
        <CodeMenu />
        {interpreter.isRunning ? (
          <>
            <Button
              variant="contained"
              disabled={!interpreter.isPaused}
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
              disabled={!interpreter.isPaused}
              onClick={() => {
                interpreter.runLoop();
              }}
              sx={{
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
