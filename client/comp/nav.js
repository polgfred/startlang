'use strict';

import React from 'react';

import {
  Navbar, Nav, NavItem, NavDropdown, MenuItem,
  ButtonToolbar, Button, Grid, Row, Col
} from 'react-bootstrap';

import CBase from './base';

export default class CNav extends CBase {
  shouldComponentUpdate(nextProps) {
    return this.props.mode != nextProps.mode;
  }

  render() {
    return <Navbar>
      <Nav>
        <NavItem href="#">Link</NavItem>
        <NavItem href="#">Link</NavItem>
        <NavDropdown title="View" id="dropdown-3">
          <MenuItem onSelect={this.props.modeUpdate}
                    active={this.props.mode == 'graphics'}
                    eventKey="graphics">Graphics</MenuItem>
          <MenuItem onSelect={this.props.modeUpdate}
                    active={this.props.mode == 'text'}
                    eventKey="text">Text</MenuItem>
          <MenuItem onSelect={this.props.modeUpdate}
                    active={this.props.mode == 'split'}
                    eventKey="split">Split</MenuItem>
        </NavDropdown>
      </Nav>
      <ButtonToolbar className="pull-right">
        <Button bsStyle="primary" onClick={this.props.onRun}>Run</Button>
      </ButtonToolbar>
    </Navbar>;
  }
}
