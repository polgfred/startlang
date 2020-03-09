import process from 'process';

import React, { useCallback, useEffect, useMemo, useState } from 'react';

import Grid from '@material-ui/core/Grid';
import Paper from '@material-ui/core/Paper';
import { MuiThemeProvider, createMuiTheme } from '@material-ui/core/styles';

import Header from './header';
import Graphics from './graphics';
import Term from './term';
// import Help from './help';
import Editor from './editor';
import Builder from './builder';
// import Inspector from './inspector';

import { makeInterpreter, registerGlobals } from '../lang/interpreter';
import { graphicsGlobals, graphicsProps } from '../lang/graphics';

const theme = createMuiTheme({
  palette: {
    primary: {
      main: '#6b9da0',
    },
    secondary: {
      main: '#ffd1aa',
    },
  },
});

export default function App() {
  const [viewMode, setViewMode] = useState('help');
  const [editMode, setEditMode] = useState('source');
  const [gfx, setGfx] = useState(graphicsProps);
  const [buf, setBuf] = useState([]);
  const [parser, setParser] = useState(() => {});
  const [{ prompt, onInputComplete }, setInputState] = useState({});
  // const [{ hist, snap }, setHistory] = useState({
  //   hist: [],
  //   snap: 0,
  // });

  const clearDisplay = useCallback(() => {
    setGfx(graphicsProps);
    setBuf([]);
  }, []);

  const refreshState = useCallback(() => {
    clearDisplay();
    if (viewMode === 'help') {
      setViewMode('split');
    }
  }, [viewMode, clearDisplay]);

  const clearHistory = useCallback(() => {
    // setHistory({ hist: [], snap: 0 });
  }, []);

  const handleInput = useCallback(
    input => {
      if (onInputComplete) {
        onInputComplete(input);
        setInputState({});
      }
    },
    [onInputComplete]
  );

  // TODO: get history working
  // updateSlider(ev) {
  //   let { hist } = this.state,
  //     snap = ev.target.value,
  //     current = hist[snap];
  //
  //   if (current) {
  //     this.setState({
  //       snap,
  //       gfx: current.gfx,
  //       buf: current.buf,
  //     });
  //   }
  // }
  //
  // snapshot() {
  //   // change hist mutably, but still strigger a state change
  //   this.setState(state => {
  //     let interp = this.interp,
  //       hist = state.hist;
  //
  //     hist.push({
  //       fn: interp.fn,
  //       ns: interp.ns,
  //       st: interp.st,
  //       frame: interp.frame,
  //       fst: interp.fst,
  //       gfx: state.gfx,
  //       buf: state.buf,
  //     });
  //     return { hist, snap: hist.length };
  //   });
  // }

  const snapshot = useCallback(() => {}, []);

  const bindings = useMemo(
    () => ({
      clearDisplay,
      setGfx,
      setBuf,
      setInputState,
      snapshot,
    }),
    [clearDisplay, snapshot]
  );

  useEffect(() => {
    registerGlobals(graphicsGlobals(bindings));
  }, [bindings]);

  const runProgram = useCallback(async () => {
    refreshState();
    clearHistory();

    const interp = makeInterpreter();

    try {
      await interp.run(parser());
      console.log('done'); // eslint-disable-line no-console
      console.log(interp.snapshot()); // eslint-disable-line no-console
    } catch (err) {
      if (process.env.NODE_ENV !== 'production') {
        console.log(err.stack); // eslint-disable-line no-console
        console.log(interp.snapshot()); // eslint-disable-line no-console
      }
    }
  }, [parser, refreshState, clearHistory]);

  const inspect = false;
  const columns = inspect ? 4 : 6;

  return (
    <MuiThemeProvider theme={theme}>
      <div
        style={{
          backgroundColor: theme.palette.background.default,
        }}
      >
        <Grid container spacing={1}>
          <Grid item xs={12}>
            <Header
              viewMode={viewMode}
              editMode={editMode}
              updateViewMode={setViewMode}
              updateEditMode={setEditMode}
              runProgram={runProgram}
            />
          </Grid>
          <Grid item xs={columns}>
            <Paper
              elevation={3}
              style={{
                height: 'calc(65vh - 74px)',
                padding: '10px',
              }}
            >
              <Graphics shapes={gfx.shapes} />
            </Paper>
            <Paper
              elevation={3}
              style={{
                height: 'calc(35vh - 74px)',
                marginTop: '8px',
                padding: '10px',
              }}
            >
              <Term buf={buf} prompt={prompt} handleInput={handleInput} />
            </Paper>
          </Grid>
          {inspect && (
            <Grid item xs={columns}>
              <Paper
                elevation={3}
                style={{
                  height: 'calc(100vh - 120px)',
                  padding: '10px',
                }}
              >
                {/* <Inspector
                  hist={hist}
                  snap={snap}
                  updateSlider={() => {} updateSlider}
                /> */}
              </Paper>
            </Grid>
          )}
          <Grid item xs={columns}>
            <Paper
              elevation={3}
              style={{
                height: 'calc(100vh - 100px)',
              }}
            >
              {editMode === 'blocks' && <Builder setParser={setParser} />}
              {editMode === 'source' && <Editor setParser={setParser} />}
            </Paper>
          </Grid>
        </Grid>
      </div>
    </MuiThemeProvider>
  );
}
