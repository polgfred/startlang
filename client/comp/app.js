'use strict';

import React from 'react';
import ReactDOM from 'react-dom';

import {
  Navbar, Nav, NavItem, NavDropdown, MenuItem,
  ButtonToolbar, Button, Grid, Row, Col
} from 'react-bootstrap';

import immutable from 'immutable';

import CBase from './base';
import CTerm from './term';
import CGraphics from './graphics';
import CEditor from './editor';

import parser from '../../lang/parser.pegjs';
import { createInterpreter } from '../../lang/interpreter';
import { createBuilder } from '../../lang/builder';
import { SGraphics, createRuntime } from '../../lang/graphics';

export default class CApp extends CBase {
  constructor(props) {
    super(props);

    this.onGfxUpdate = this.onGfxUpdate.bind(this);
    this.onRun = this.onRun.bind(this);

    this.state = {
      gfx: new SGraphics()
    };
  }

  onGfxUpdate(mut) {
    this.setState({ gfx: mut(this.state.gfx) });
  }

  onRun() {
    let interp = createInterpreter();
    interp.root = parser.parse(this.editor.source);
    interp.runtime = createRuntime();
    interp.ctx.update = this.onGfxUpdate;
    interp.run().catch((err) => {
      console.log(err);
      console.log(err.stack);
    });
  }

  render() {
    return <div className="start-app mode-split">
      <Navbar>
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
          <Button bsStyle="primary" onClick={ this.onRun }>Run</Button>
        </ButtonToolbar>
      </Navbar>
      <Grid className="start-body" fluid>
        <Row>
          <Col md={6}>
            <CGraphics data={ this.state.gfx } update={ this.onGfxUpdate }/>
            <CTerm buf={ immutable.List() }/>
          </Col>
          <Col md={6}>
            <CEditor ref={ (ref) => { this.editor = ref; } }/>
          </Col>
        </Row>
      </Grid>
    </div>;
  }
}
