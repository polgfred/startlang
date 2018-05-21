import React, { Component } from 'react';
import ReactDOM from 'react-dom';
import immutable from 'immutable';
import autobind from 'autobind-decorator';

import Grid from '@material-ui/core/Grid'
import Paper from '@material-ui/core/Paper'

import Header from './header';
import Graphics from './graphics';
//import Term from './term';
//import Help from './help';
import Editor from './editor';
import Builder from './builder';
import Inspector from './inspector';

import { SInterpreter } from '../lang/interpreter';
import { SGRuntime, SGraphics } from '../lang/graphics';

// these require more porting from foundation
class Empty extends Component {
  render() {
    return null;
  }
}
const Term = Empty;
const Help = Empty;

export default class App extends Component {
  constructor(props) {
    super(props);

    this.state = {
      viewMode: 'help',
      editMode: 'source',
      gfx: new SGraphics(),
      buf: immutable.List(),
      hist: [],
      snap: 0
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

  @autobind
  updateViewMode(viewMode) {
    this.setState({ viewMode });
  }

  @autobind
  updateEditMode(editMode) {
    this.setState({ editMode });
  }

  clearDisplay() {
    this.setState({
      gfx: state.gfx.clear(),
      buf: state.buf.clear()
    });
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

  @autobind
  handleKeyUp(ev) {
    if (ev.ctrlKey) {
      if (ev.keyCode == 82) {
        ev.stopPropagation();
        this.runProgram();
      }
    }
  }

  @autobind
  updateSlider(ev) {
    let { hist } = this.state,
        snap = ev.target.value,
        current = hist[snap];

    if (current) {
      this.setState({
        snap,
        gfx: current.gfx,
        buf: current.buf
      });
    }
  }

  @autobind
  runProgram() {
    return this.refreshState().then(() => {
      let interp = this.interp = new SInterpreter(this);
      interp.ctx = new SGRuntime(this);
      interp.root(this.refs.editor.getRoot());
      this.clearHistory();

      return interp.run().catch((err) => {
        console.log(err);
        console.log(err.stack);
      });
    });
  }

  clearHistory() {
    this.setState({ hist: [], snap: 0 });
  }

  snapshot() {
    // change hist mutably, but still strigger a state change
    this.setState((state) => {
      let interp = this.interp, hist = state.hist;

      hist.push({
        fn: interp.fn,
        ns: interp.ns,
        st: interp.st,
        frame: interp.frame,
        fst: interp.fst,
        gfx: state.gfx,
        buf: state.buf
      });
      return { hist, snap: hist.length };
    });
  }

  render() {
    let { viewMode, editMode, gfx, buf, ns, hist, snap } = this.state;
    let inspect = false;

    return (
      <div>
        <Grid container spacing={ 16 }>
          <Grid item xs={ 12 }>
            <Header
              viewMode={ viewMode }
              editMode={ editMode }
              updateViewMode={ this.updateViewMode }
              updateEditMode={ this.updateEditMode }
              runProgram={ this.runProgram }
            />
          </Grid>
          <Grid item xs={ 6 }>
            <Paper
              elevation={ 2 }
              style={{
                height: 'calc(65vh - 50px)',
              }}>
              <Graphics data={ gfx } />
            </Paper>
            <Paper
              elevation={ 2 }
              style={{
                height: 'calc(35vh - 50px)',
              }}>
              <Term buf={ buf } ref="term" />
            </Paper>
            <Help />
          </Grid>
          <Grid item xs={ 6 }>
            <Paper
              elevation={ 2 }
              style={{
                height: 'calc(100vh - 100px)',
              }}>
              { editMode == 'blocks' && <Builder ref="editor" /> }
              { editMode == 'source' && <Editor ref="editor" /> }
            </Paper>
          </Grid>
          {
            false &&
            <Grid item xs={ false }>
              {
                inspect &&
                <div>
                  <Inspector
                    hist={ hist }
                    snap={ snap }
                    updateSlider={ this.updateSlider }
                  />
                </div>
              }
            </Grid>
          }
        </Grid>
      </div>
    );
  }
}
