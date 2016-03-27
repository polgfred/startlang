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
import CGraphics from './graphics';
import CTerm from './term';
import CHelp from './help';
import CEditor from './editor';
import CBuilder from './builder';

import { SInterpreter } from '../../lang/interpreter';
import { SBuilder } from '../../lang/builder';
import { SGRuntime, SGraphics } from '../../lang/graphics';

export default class CApp extends CBase {
  constructor(props) {
    super(props);

    this.runProgram = this.runProgram.bind(this);
    this.modeUpdate = this.modeUpdate.bind(this);

    this.initialState = {
      gfx: new SGraphics(),
      buf: immutable.List()
    };

    this.state = {
      mode: 'help',
      gfx: new SGraphics(),
      buf: immutable.List()
    };
  }

  modeUpdate(ev, mode) {
    this.setState({ mode });
  }

  gfxUpdate(mut) {
    this.setState((state) => ({ gfx: mut(state.gfx) }));
  }

  termUpdate(mut) {
    this.setState((state) => ({ buf: mut(state.buf) }));
  }

  termInput(prompt, complete) {
    this.refs.term.getInput(prompt, (input) => {
      this.termUpdate((buf) => buf.push(`${prompt}${input}`));
      complete(input);
    });
  }

  runProgram() {
    this.setState(this.initialState);

    // wait long enough before the initial run to let the DOM clear
    Meteor.setTimeout(() => {
      let interp = new SInterpreter();
      interp.root = this.refs.editor.getRoot();
      interp.runtime = new SGRuntime(this);
      interp.run().catch((err) => {
        console.log(err);
        console.log(err.stack);
      });
    }, 25);
  }

  render() {
    return <div className={`start-app mode-${this.state.mode}`}>
      <CNav mode={this.state.mode}
            modeUpdate={this.modeUpdate}
            runProgram={this.runProgram} />
      <Grid className="start-body" fluid>
        <Row>
          <Col className="start-column" md={7}>
            <CGraphics data={this.state.gfx} />
            <CTerm buf={this.state.buf} ref="term" />
            <CHelp />
          </Col>
          <Col className="start-column" md={5}>
            <CBuilder ref="editor" />
          </Col>
        </Row>
      </Grid>
    </div>;
  }
}
