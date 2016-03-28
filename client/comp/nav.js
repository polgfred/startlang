'use strict';

import React from 'react';

import {
  Navbar, Nav, NavItem, NavDropdown, MenuItem,
  ButtonToolbar, Button, Grid, Row, Col
} from 'react-bootstrap';

import CBase from './base';

export default class CNav extends CBase {
  shouldComponentUpdate(nextProps) {
    return this.props.viewMode != nextProps.viewMode ||
            this.props.editMode != nextProps.editMode;
  }

  render() {
    return <Navbar>
      <Nav>
        <NavDropdown title="View" id="dropdown-view-mode">
          <MenuItem onSelect={this.props.updateViewMode}
                    active={this.props.viewMode == 'graphics'}
                    eventKey="graphics">Graphics</MenuItem>
          <MenuItem onSelect={this.props.updateViewMode}
                    active={this.props.viewMode == 'text'}
                    eventKey="text">Text</MenuItem>
          <MenuItem onSelect={this.props.updateViewMode}
                    active={this.props.viewMode == 'split'}
                    eventKey="split">Split</MenuItem>
          <MenuItem onSelect={this.props.updateViewMode}
                    active={this.props.viewMode == 'help'}
                    eventKey="help">Help</MenuItem>
        </NavDropdown>
        <NavDropdown title="Edit" id="dropdown-edit-mode">
          <MenuItem onSelect={this.props.updateEditMode}
                    active={this.props.editMode == 'blocks'}
                    eventKey="blocks">Blocks</MenuItem>
          <MenuItem onSelect={this.props.updateEditMode}
                    active={this.props.editMode == 'source'}
                    eventKey="source">Source</MenuItem>
        </NavDropdown>
      </Nav>
      <ButtonToolbar className="pull-right">
        <Button bsStyle="primary" onClick={this.props.runProgram}>Run</Button>
      </ButtonToolbar>
    </Navbar>;
  }
}
