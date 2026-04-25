import {
  AppBar,
  Badge,
  Box,
  Button,
  ButtonGroup,
  Divider,
  Link as MuiLink,
  Menu,
  MenuItem,
  Toolbar,
  Typography,
} from '@mui/material';
import { MouseEvent, useCallback, useState } from 'react';

import boxScript from '../tests/box.start';
import investScript from '../tests/invest.start';
import layoutScript from '../tests/layout.start';
import numguessScript from '../tests/numguess.start';
import sieveScript from '../tests/sieve.start';
import sineScript from '../tests/sine.start';
import victorScript from '../tests/victor.start';

import { useEditor } from './editor-context.jsx';

type OutputTab = 'graphics' | 'text';

const headerButtonSx = {
  height: 36,
  minWidth: 112,
  px: 2,
  boxShadow: 'none',
};

function SocialIcon({ src }: { src: string }) {
  return (
    <Box
      aria-hidden="true"
      sx={(theme) => ({
        display: 'block',
        height: 32,
        width: 32,
        backgroundColor: theme.palette.primary.main,
        mask: `url(${src}) center / contain no-repeat`,
        WebkitMask: `url(${src}) center / contain no-repeat`,
      })}
    />
  );
}

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

function OutputSwitcher({
  outputTab,
  setOutputTab,
  hasGraphicsOutput,
  hasTextOutput,
}: {
  outputTab: OutputTab;
  setOutputTab: (value: OutputTab) => void;
  hasGraphicsOutput: boolean;
  hasTextOutput: boolean;
}) {
  return (
    <ButtonGroup
      size="small"
      sx={{
        marginLeft: 2,
        height: 36,
      }}
    >
      <Badge
        color="warning"
        variant="dot"
        invisible={outputTab === 'graphics' || !hasGraphicsOutput}
      >
        <Button
          variant={outputTab === 'graphics' ? 'contained' : 'outlined'}
          color="secondary"
          onClick={() => {
            setOutputTab('graphics');
          }}
          sx={headerButtonSx}
        >
          Graphics
        </Button>
      </Badge>
      <Badge
        color="warning"
        variant="dot"
        invisible={outputTab === 'text' || !hasTextOutput}
      >
        <Button
          variant={outputTab === 'text' ? 'contained' : 'outlined'}
          color="secondary"
          onClick={() => {
            setOutputTab('text');
          }}
          sx={headerButtonSx}
        >
          Text
        </Button>
      </Badge>
    </ButtonGroup>
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
  runProgram,
}: {
  runProgram: () => void;
}) {
  const { anchor, openMenu, closeMenu } = useMenu();
  const { setValue } = useEditor();

  const loadScript = useCallback(
    (script: string) => {
      setValue(script);
      closeMenu();
      runProgram();
    },
    [closeMenu, runProgram, setValue]
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
            setValue('');
            closeMenu();
          }}
        >
          New
        </MenuItem>
      </Menu>
    </>
  );
}

export default function Header({
  outputTab,
  setOutputTab,
  hasGraphicsOutput,
  hasTextOutput,
  isProgramActive,
  showInspector,
  setShowInspector,
  runProgram,
  runLabel,
  stopProgram,
  isStopDisabled,
}: {
  outputTab: OutputTab;
  setOutputTab: (value: OutputTab) => void;
  hasGraphicsOutput: boolean;
  hasTextOutput: boolean;
  isProgramActive: boolean;
  showInspector: boolean;
  setShowInspector: (value: boolean) => void;
  runProgram: () => void;
  runLabel: string;
  stopProgram: () => void;
  isStopDisabled: boolean;
}) {
  return (
    <AppBar
      position="static"
      sx={{
        flexDirection: 'row',
        justifyContent: 'space-between',
        backgroundColor: '#f7f9fa',
        color: '#263238',
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
            fontWeight: 700,
          }}
        >
          START
        </Typography>
        <CodeMenu runProgram={runProgram} />
        <OutputSwitcher
          outputTab={outputTab}
          setOutputTab={setOutputTab}
          hasGraphicsOutput={hasGraphicsOutput}
          hasTextOutput={hasTextOutput}
        />
        <Button
          variant="outlined"
          color="secondary"
          onClick={() => {
            setShowInspector(!showInspector);
          }}
          sx={{
            ...headerButtonSx,
            backgroundColor: showInspector ? 'rgba(69, 90, 100, 0.1)' : null,
          }}
        >
          Inspector
        </Button>
        <Button
          variant="contained"
          color="primary"
          disabled={isProgramActive}
          onClick={runProgram}
          sx={{
            marginLeft: 2,
            ...headerButtonSx,
            minWidth: 96,
            boxShadow: 2,
          }}
        >
          {runLabel}
        </Button>
        <Button
          variant="outlined"
          color="secondary"
          disabled={isStopDisabled}
          onClick={stopProgram}
          sx={{
            ...headerButtonSx,
            minWidth: 96,
          }}
        >
          Stop
        </Button>
      </Toolbar>
      <Toolbar
        sx={{
          gap: 1,
        }}
      >
        <MuiLink
          href="https://linkedin.com/in/polgfred"
          target="_blank"
          rel="noreferrer"
          aria-label="LinkedIn"
          underline="none"
        >
          <SocialIcon src="/linkedin-logo.svg" />
        </MuiLink>
        <MuiLink
          href="https://github.com/polgfred/startlang"
          target="_blank"
          rel="noreferrer"
          aria-label="GitHub"
          underline="none"
        >
          <SocialIcon src="/github-logo.svg" />
        </MuiLink>
      </Toolbar>
    </AppBar>
  );
}
