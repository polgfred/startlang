'use strict';

import { Meteor } from 'meteor/meteor';
import { _ } from 'meteor/underscore';

import React from 'react';
import ReactDOM from 'react-dom';

import {
  Navbar, Nav, NavItem, NavDropdown, MenuItem,
  ButtonToolbar, Button, Grid, Row, Col
} from 'react-bootstrap';

import immutable from 'immutable';

import Base from './base';
import Header from './header';
import Graphics from './graphics';
import Term from './term';
import Help from './help';
import Editor from './editor';
import Builder from './builder';

import { SInterpreter } from '../lang/interpreter';
import { SGRuntime, SGraphics } from '../lang/graphics';

export default class App extends Base {
  constructor(props) {
    super(props);

    _.bindAll(this,
      'handleKeyUp',
      'runProgram',
      'updateViewMode',
      'updateEditMode');

    this.state = {
      viewMode: 'help',
      editMode: 'blocks',
      gfx: new SGraphics(),
      buf: immutable.List()
    };
  }

  refreshState() {
    // reset the graphics and terminal state
    this.setState((state) => {
      let newState = {
        gfx: new SGraphics(),
        buf: immutable.List()
      };

      // if we're in help view, switch to split view
      if (state.viewMode == 'help') {
        newState.viewMode = 'split';
      }

      return newState;
    });
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

  handleKeyUp(ev) {
    if (ev.ctrlKey) {
      if (ev.keyCode == 82) {
        ev.stopPropagation();
        this.runProgram();
      }
    }
  }

  runProgram() {
    this.refreshState();

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
      <Header viewMode={viewMode}
              editMode={editMode}
              updateViewMode={this.updateViewMode}
              updateEditMode={this.updateEditMode}
              runProgram={this.runProgram} />
      <Grid className="start-body" fluid>
        <Row>
          <Col className="start-column" md={7}>
            { showGraphics && <Graphics data={this.state.gfx} /> }
            { showTerm && <Term buf={this.state.buf} ref="term" /> }
            { showHelp && <Help /> }
          </Col>
          <Col className="start-column" md={5} onKeyUp={this.handleKeyUp}>
            { editMode == 'blocks' && <Builder ref="editor" /> }
            { editMode == 'source' && <Editor ref="editor" /> }
          </Col>
        </Row>
      </Grid>
    </div>;
  }
}
