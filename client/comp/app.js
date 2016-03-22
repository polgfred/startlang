'use strict';

import React from 'react';
import ReactDOM from 'react-dom';

import {
  Navbar, Nav, NavItem, NavDropdown, MenuItem,
  ButtonToolbar, Button, Grid, Row, Col
} from 'react-bootstrap';

import immutable from 'immutable';

import CBase from './base';
import CNav from './nav';
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

    this.onRun = this.onRun.bind(this);
    this.onGfxUpdate = this.onGfxUpdate.bind(this);
    this.onTermUpdate = this.onTermUpdate.bind(this);
    this.onTermInput = this.onTermInput.bind(this);

    this.state = this.initialState = {
      gfx: new SGraphics(),
      buf: immutable.List()
    };
  }

  onGfxUpdate(mut) {
    this.setState((state) => ({ gfx: mut(state.gfx) }));
  }

  onTermUpdate(mut) {
    this.setState((state) => ({ buf: mut(state.buf) }));
  }

  onTermInput(prompt, complete) {
    this.refs.term.getInput(prompt, (input) => {
      this.onTermUpdate((buf) => buf.push(`${prompt}${input}`));
      complete(input);
    });
  }

  onRun() {
    this.setState(this.initialState);

    // wait long enough before the initial run to let the DOM clear
    setTimeout(() => {
      let interp = createInterpreter();
      interp.root = parser.parse(this.refs.editor.source);
      interp.runtime = createRuntime();
      interp.ctx.gfxUpdate = this.onGfxUpdate;
      interp.ctx.termUpdate = this.onTermUpdate;
      interp.ctx.termInput = this.onTermInput;
      interp.run().catch((err) => {
        console.log(err);
        console.log(err.stack);
      });
    }, 25);
  }

  render() {
    return <div className="start-app mode-split">
      <CNav onRun={ this.onRun } />
      <Grid className="start-body" fluid>
        <Row>
          <Col className="start-column" md={7}>
            <CGraphics data={ this.state.gfx } />
            <CTerm buf={ this.state.buf } ref="term" />
          </Col>
          <Col className="start-column" md={5}>
            <CEditor ref="editor" />
          </Col>
        </Row>
      </Grid>
    </div>;
  }
}
