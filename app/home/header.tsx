import {
  AppBar,
  Button,
  Divider,
  Menu,
  MenuItem,
  Toolbar,
  Typography,
} from '@mui/material';
import { MouseEvent, useCallback, useState } from 'react';

type ViewMode = 'graphics' | 'text';

export default function Header({
  viewMode,
  updateViewMode,
  showInspector,
  setShowInspector,
  runProgram,
  isRunning,
}: {
  viewMode: string;
  updateViewMode: (mode: ViewMode) => void;
  showInspector: boolean;
  setShowInspector: (value: boolean) => void;
  runProgram: () => void;
  isRunning: boolean;
}) {
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

  const handleUpdateMode = useCallback(
    (value: ViewMode) => {
      updateViewMode(value);
      closeMenu();
    },
    [updateViewMode, closeMenu]
  );

  const handleToggleInspector = useCallback(
    (showInspector: boolean) => {
      setShowInspector(showInspector);
      closeMenu();
    },
    [setShowInspector, closeMenu]
  );

  return (
    <AppBar position="static">
      <Toolbar color="light">
        <Typography
          variant="body1"
          sx={{
            marginRight: '24px',
          }}
        >
          START
        </Typography>
        <Button variant="text" color="secondary" onClick={openMenu}>
          View
        </Button>
        <Menu open={anchor !== null} anchorEl={anchor} onClose={closeMenu}>
          <MenuItem
            selected={viewMode === 'graphics'}
            onClick={() => {
              handleUpdateMode('graphics');
            }}
          >
            Graphics
          </MenuItem>
          <MenuItem
            selected={viewMode === 'text'}
            onClick={() => {
              handleUpdateMode('text');
            }}
          >
            Text
          </MenuItem>
          <Divider />
          <MenuItem
            selected={showInspector}
            onClick={() => {
              handleToggleInspector(!showInspector);
            }}
          >
            Inspector
          </MenuItem>
        </Menu>
        <Button
          variant="contained"
          disabled={isRunning}
          onClick={runProgram}
          sx={{
            marginLeft: 2,
            backgroundColor: '#cccccc',
            color: '#222222',
          }}
        >
          Run
        </Button>
      </Toolbar>
    </AppBar>
  );
}
