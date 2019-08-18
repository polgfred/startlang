import React, { useCallback, useState } from 'react';

import AppBar from '@material-ui/core/AppBar';
import Button from '@material-ui/core/Button';
import Menu from '@material-ui/core/Menu';
import MenuItem from '@material-ui/core/MenuItem';
import Toolbar from '@material-ui/core/Toolbar';
import Typography from '@material-ui/core/Typography';

function SettingsMenu({ option, mode, choices, updateMode }) {
  const [anchor, setAnchor] = useState();

  const openMenu = useCallback(
    ev => {
      setAnchor(ev.currentTarget);
    },
    [setAnchor]
  );

  const closeMenu = useCallback(() => {
    setAnchor(null);
  }, [setAnchor]);

  const handleUpdateMode = useCallback(
    value => {
      updateMode(value);
      closeMenu();
    },
    [updateMode, closeMenu]
  );

  return (
    <>
      <Button onClick={openMenu}>{option}</Button>
      <Menu open={!!anchor} anchorEl={anchor} onClose={closeMenu}>
        {choices.map(value => (
          <MenuItem
            key={`menu-item-${option}-${value}`}
            selected={mode == value}
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
          variant="title"
          style={{
            marginRight: '24px',
          }}
        >
          START
        </Typography>
        <SettingsMenu
          option="view"
          mode={viewMode}
          updateMode={updateViewMode}
          choices={['graphics', 'text', 'split', 'help']}
        />
        <SettingsMenu
          option="edit"
          mode={editMode}
          updateMode={updateEditMode}
          choices={['blocks', 'source']}
        />
        <Button onClick={runProgram}>Run</Button>
      </Toolbar>
    </AppBar>
  );
}
