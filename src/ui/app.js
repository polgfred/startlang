import React, {
  Component,
  createRef,
} from 'react';
import immutable from 'immutable';
import autobind from 'autobind-decorator';

import Grid from '@material-ui/core/Grid'
import Paper from '@material-ui/core/Paper'
import {
  MuiThemeProvider,
  createMuiTheme,
} from '@material-ui/core/styles'

import Header from './header';
import Graphics from './graphics';
import Term from './term';
// import Help from './help';
import Editor from './editor';
import Builder from './builder';
import Inspector from './inspector';

import { SInterpreter } from '../lang/interpreter';
import { SGRuntime, SGraphics } from '../lang/graphics';

const theme = createMuiTheme({
  palette: {
    primary: {
      main: '#6b9da0'
    },
    secondary: {
      main: '#ffd1aa',
    },
  }
});

export default class App extends Component {
  constructor(props) {
    super(props);

    this.editorRef = createRef();
    this.termRef = createRef();

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
    this.termRef.current.getInput(prompt, (input) => {
      //this.termUpdate((buf) => buf.push(`${prompt}${input}`));
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
      interp.root(this.editorRef.current.getRoot());
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
    let { viewMode, editMode, gfx, buf, hist, snap } = this.state;
    let inspect = true;
    let columns = inspect ? 4 : 6;

    return (
      <MuiThemeProvider theme={ theme }>
        <div style={{
          backgroundColor: theme.palette.background.default,
        }}>
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
            <Grid item xs={ columns }>
              <Paper
                elevation={ 3 }
                style={{
                  height: 'calc(65vh - 80px)',
                  padding: '10px',
                }}>
                <Graphics data={ gfx } />
              </Paper>
              <Paper
                elevation={ 3 }
                style={{
                  height: 'calc(35vh - 80px)',
                  marginTop: '20px',
                  padding: '10px',
                }}>
                <Term buf={ buf } ref={ this.termRef } />
              </Paper>
            </Grid>
            {
              inspect && (
                <Grid item xs={ columns }>
                  <Paper
                    elevation={ 3 }
                    style={{
                      height: 'calc(100vh - 120px)',
                      padding: '10px',
                    }}>
                    <Inspector
                      hist={ hist }
                      snap={ snap }
                      updateSlider={ this.updateSlider }
                    />
                  </Paper>
                </Grid>
              )
            }
            <Grid item xs={ columns }>
              <Paper
                elevation={ 3 }
                style={{
                  height: 'calc(100vh - 100px)',
                }}>
                { editMode == 'blocks' && <Builder ref={ this.editorRef } /> }
                { editMode == 'source' && <Editor ref={ this.editorRef } /> }
              </Paper>
            </Grid>
          </Grid>
        </div>
      </MuiThemeProvider>
    );
  }
}
