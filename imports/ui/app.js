'use strict';

import { $ } from 'meteor/jquery';
import { _ } from 'meteor/underscore';

import React from 'react';
import ReactDOM from 'react-dom';

import { Grid, Row, Column } from 'react-foundation';

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
    return new Promise((resolve) => {
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
      }, resolve);
    });
  }

  updateViewMode(viewMode) {
    this.setState({ viewMode });
  }

  updateEditMode(editMode) {
    this.setState({ editMode });
  }

  clearDisplay() {
    this.setState((state) => ({
      gfx: state.gfx.clear(),
      buf: state.buf.clear()
    }));
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
    this.refreshState().then(() => {
      let interp = this.interp = new SInterpreter(this);
      interp.ctx = new SGRuntime(this);
      interp.root(this.refs.editor.getRoot());

      interp.run().catch((err) => {
        console.log(err);
        console.log(err.stack);
      });
    });
  }

  render() {
    let { viewMode, editMode, gfx, buf } = this.state;

    return <div className={`start-app start-view-mode-${viewMode}`}>
      <Header viewMode={viewMode}
              editMode={editMode}
              updateViewMode={this.updateViewMode}
              updateEditMode={this.updateEditMode}
              runProgram={this.runProgram} />
      <div className="start-body">
        <Row className="start-main" isExpanded onKeyUp={this.handleKeyUp}>
          <Column className="start-column" large={5}>
            <Graphics data={gfx} />
            <Term buf={buf} ref="term" />
            <Help />
          </Column>
          <Column className="start-column" large={7}>
            { editMode == 'blocks' && <Builder ref="editor" /> }
            { editMode == 'source' && <Editor ref="editor" /> }
          </Column>
        </Row>
      </div>
    </div>;
    // <Row className="start-slider" isExpanded>
    //   <Column large={12}>
    //     <input type="range" />
    //   </Column>
    // </Row>
  }

  componentDidMount() {
    this.$().foundation();
  }
}
