'use strict';

import { $ } from 'meteor/jquery';
import React from 'react';
import ReactDOM from 'react-dom';

import {
  Navbar, Nav, NavItem, NavDropdown,
  MenuItem, Grid, Row, Col
} from 'react-bootstrap';

import immutable from 'immutable';

import CBase from './base';
import CTerm from './term';
import CGraphics from './graphics';
import CEditor from './editor';

export default class CApp extends CBase {
  render() {
    return <div className="start-app mode-split">
      <Navbar>
        <Nav>
          <NavItem eventKey={1} href="#">Link</NavItem>
          <NavItem eventKey={2} href="#">Link</NavItem>
          <NavDropdown eventKey={3} title="Dropdown" id="dropdown-3">
            <MenuItem eventKey={3.1}>Action</MenuItem>
            <MenuItem eventKey={3.2}>Another action</MenuItem>
            <MenuItem eventKey={3.3}>Something else here</MenuItem>
            <MenuItem divider />
            <MenuItem eventKey={3.3} href="#">Separated link</MenuItem>
          </NavDropdown>
        </Nav>
        <Nav pullRight>
          <NavItem eventKey={5} active>Run</NavItem>
        </Nav>
      </Navbar>
      <Grid className="start-body" fluid>
        <Row>
          <Col md={6}>
            <CGraphics data={{ shapes: immutable.List() }}/>
            <CTerm buf={ immutable.List() }/>
          </Col>
          <Col md={6}>
            <CEditor />
          </Col>
        </Row>
      </Grid>
    </div>;
  }
}
