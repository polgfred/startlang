'use strict';

import React from 'react';

import {
  Navbar, Nav, NavItem, NavDropdown, MenuItem,
  ButtonToolbar, Button, Grid, Row, Col
} from 'react-bootstrap';

import CBase from './base';

export default class CNav extends CBase {
  shouldComponentUpdate() {
    return false;
  }

  render() {
    return <Navbar>
      <Nav>
        <NavItem href="#">Link</NavItem>
        <NavItem href="#">Link</NavItem>
        <NavDropdown title="Dropdown" id="dropdown-3">
          <MenuItem>Action</MenuItem>
          <MenuItem>Another action</MenuItem>
          <MenuItem>Something else here</MenuItem>
          <MenuItem divider />
          <MenuItem href="#">Separated link</MenuItem>
        </NavDropdown>
      </Nav>
      <ButtonToolbar className="pull-right">
        <Button bsStyle="primary" onClick={ this.props.onRun }>Run</Button>
      </ButtonToolbar>
    </Navbar>;
  }
}
