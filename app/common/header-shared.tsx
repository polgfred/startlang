import { Button, Divider, Menu, MenuItem } from '@mui/material';
import { editor } from 'monaco-editor';
import { MouseEvent, RefObject, useCallback, useState } from 'react';

import type { ViewMode } from '../../src/desktop/types.js';
import boxScript from '../../tests/box.start';
import investScript from '../../tests/invest.start';
import layoutScript from '../../tests/layout.start';
import numguessScript from '../../tests/numguess.start';
import sieveScript from '../../tests/sieve.start';
import sineScript from '../../tests/sine.start';
import victorScript from '../../tests/victor.start';

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

export function ViewMenu({
  viewMode,
  setViewMode,
  showInspector,
  setShowInspector,
}: {
  viewMode: ViewMode;
  setViewMode: (mode: ViewMode) => void;
  showInspector: boolean;
  setShowInspector: (value: boolean) => void;
}) {
  const { anchor, openMenu, closeMenu } = useMenu();

  return (
    <>
      <Button variant="text" color="secondary" onClick={openMenu}>
        View
      </Button>
      <Menu open={anchor !== null} anchorEl={anchor} onClose={closeMenu}>
        <MenuItem
          selected={viewMode === 'graphics'}
          onClick={() => {
            setViewMode('graphics');
            closeMenu();
          }}
        >
          Graphics
        </MenuItem>
        <MenuItem
          selected={viewMode === 'text'}
          onClick={() => {
            setViewMode('text');
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

export function CodeMenu({
  editorRef,
  runProgram,
}: {
  editorRef: RefObject<editor.ICodeEditor | null>;
  runProgram: () => void | Promise<void>;
}) {
  const { anchor, openMenu, closeMenu } = useMenu();

  const loadScript = useCallback(
    (script: string) => {
      if (editorRef.current) {
        editorRef.current.setValue(script);
        closeMenu();
        void runProgram();
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
