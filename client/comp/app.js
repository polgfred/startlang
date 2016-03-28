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
    this.updateViewMode = this.updateViewMode.bind(this);
    this.updateEditMode = this.updateEditMode.bind(this);

    this.initialState = {
      gfx: new SGraphics(),
      buf: immutable.List()
    };

    this.state = {
      viewMode: 'help',
      editMode: 'blocks',
      gfx: new SGraphics(),
      buf: immutable.List()
    };
  }

  updateViewMode(ev, viewMode) {
    this.setState({ viewMode });
  }

  updateEditMode(ev, editMode) {
    this.setState({ editMode });
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
    let viewMode = this.state.viewMode,
        editMode = this.state.editMode,
        showGraphics = viewMode == 'graphics' || viewMode == 'split',
        showTerm = viewMode == 'text' || viewMode == 'split',
        showHelp = viewMode == 'help';

    return <div className={`start-app start-view-mode-${viewMode}`}>
      <CNav viewMode={viewMode}
            editMode={editMode}
            updateViewMode={this.updateViewMode}
            updateEditMode={this.updateEditMode}
            runProgram={this.runProgram} />
      <Grid className="start-body" fluid>
        <Row>
          <Col className="start-column" md={7}>
            { showGraphics && <CGraphics data={this.state.gfx} /> }
            { showTerm && <CTerm buf={this.state.buf} ref="term" /> }
            { showHelp && <CHelp /> }
          </Col>
          <Col className="start-column" md={5}>
            { editMode == 'blocks' && <CBuilder ref="editor" /> }
            { editMode == 'source' && <CEditor ref="editor" /> }
          </Col>
        </Row>
      </Grid>
    </div>;
  }
}
