import {
  AppBar,
  Button,
  Menu,
  MenuItem,
  Toolbar,
  Typography,
} from '@mui/material';
import { useCallback, useState } from 'react';

function SettingsMenu({ option, mode, choices, updateMode }) {
  const [anchor, setAnchor] = useState();

  const openMenu = useCallback(
    (ev) => {
      setAnchor(ev.currentTarget);
    },
    [setAnchor]
  );

  const closeMenu = useCallback(() => {
    setAnchor(null);
  }, [setAnchor]);

  const handleUpdateMode = useCallback(
    (value) => {
      updateMode(value);
      closeMenu();
    },
    [updateMode, closeMenu]
  );

  return (
    <>
      <Button variant="secondary" onClick={openMenu}>{option}</Button>
      <Menu open={!!anchor} anchorEl={anchor} onClose={closeMenu}>
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
  editMode,
  updateViewMode,
  updateEditMode,
  runProgram,
}) {
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
        <SettingsMenu
          option="view"
          mode={viewMode}
          updateMode={updateViewMode}
          choices={['graphics', 'text', 'split']}
        />
        <SettingsMenu
          option="edit"
          mode={editMode}
          updateMode={updateEditMode}
          choices={['blocks', 'source']}
        />
        <Button
          variant="contained"
          onClick={runProgram}
          sx={{
            marginLeft: 6,
          }}
        >
          Run
        </Button>
      </Toolbar>
    </AppBar>
  );
}
