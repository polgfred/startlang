import {
  AppBar,
  Button,
  Menu,
  MenuItem,
  Toolbar,
  Typography,
} from '@mui/material';
import { MouseEvent, useCallback, useState } from 'react';

function SettingsMenu({
  option,
  mode,
  choices,
  updateMode,
}: {
  option: string;
  choices: readonly string[];
  mode: string;
  updateMode: (value: string) => void;
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
    (value: string) => {
      updateMode(value);
      closeMenu();
    },
    [updateMode, closeMenu]
  );

  return (
    <>
      <Button variant="text" color="secondary" onClick={openMenu}>
        {option}
      </Button>
      <Menu open={anchor !== null} anchorEl={anchor} onClose={closeMenu}>
        {choices.map((value) => (
          <MenuItem
            key={`menu-item-${option}-${value}`}
            selected={mode === value}
            onClick={() => handleUpdateMode(value)}
          >
            {value.charAt(0).toUpperCase() + value.substr(1)}
          </MenuItem>
        ))}
      </Menu>
    </>
  );
}

export default function Header({
  viewMode,
  updateViewMode,
  runProgram,
  isRunning,
}: {
  viewMode: string;
  updateViewMode: (value: string) => void;
  runProgram: () => void;
  isRunning: boolean;
}) {
  return (
    <AppBar>
      <Toolbar color="light">
        <Typography
          variant="body1"
          sx={{
            marginRight: '24px',
          }}
        >
          START
        </Typography>
        <SettingsMenu
          option="view"
          mode={viewMode}
          updateMode={updateViewMode}
          choices={['graphics', 'text']}
        />
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
