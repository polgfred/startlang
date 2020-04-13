import process from 'process';

import Paper from '@material-ui/core/Paper';
import { MuiThemeProvider, createMuiTheme } from '@material-ui/core/styles';
import React, { useCallback, useEffect, useMemo, useState } from 'react';

import { graphicsGlobals, graphicsProps } from '../lang/graphics';
import { makeInterpreter, registerGlobals } from '../lang/interpreter';

import Builder from './builder';
import Editor from './editor';
import Graphics from './graphics';
import Header from './header';
import Term from './term';
// import Help from './help';
// import Inspector from './inspector';

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

  return (
    <MuiThemeProvider theme={theme}>
      <div
        style={{
          backgroundColor: theme.palette.background.default,
          display: 'flex',
          flexDirection: 'row',
          width: '100vw',
          height: '100vh',
        }}
      >
        <div
          style={{
            height: '100vh',
            display: 'flex',
            flexDirection: 'column',
            flex: 1,
          }}
        >
          <div
            style={{
              flex: 0,
            }}
          >
            <Header
              viewMode={viewMode}
              editMode={editMode}
              updateViewMode={setViewMode}
              updateEditMode={setEditMode}
              runProgram={runProgram}
            />
          </div>
          <div
            style={{
              display: 'flex',
              flexDirection: 'row',
              flex: '1 1 auto',
            }}
          >
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                flex: '1 1 50%',
              }}
            >
              {viewMode !== 'text' && (
                <div
                  style={{
                    flex: '1 1 75%',
                  }}
                >
                  <Paper
                    elevation={3}
                    style={{
                      height: 'calc(100% - 30px)',
                      margin: '5px',
                      padding: '10px',
                    }}
                  >
                    <Graphics shapes={gfx.shapes} />
                  </Paper>
                </div>
              )}
              {viewMode !== 'graphics' && (
                <div
                  style={{
                    flex: '1 1 25%',
                  }}
                >
                  <Paper
                    elevation={3}
                    style={{
                      height: 'calc(100% - 30px)',
                      margin: '5px',
                      padding: '10px',
                    }}
                  >
                    <Term buf={buf} prompt={prompt} handleInput={handleInput} />
                  </Paper>
                </div>
              )}
              {inspect && (
                <div
                  style={{
                    flex: '1 1 auto',
                  }}
                >
                  <Paper
                    elevation={3}
                    style={{
                      height: 'calc(100% - 30px)',
                      margin: '5px',
                      padding: '10px',
                    }}
                  >
                    {/* <Inspector
                  hist={hist}
                  snap={snap}
                  updateSlider={() => {} updateSlider}
                /> */}
                  </Paper>
                </div>
              )}
            </div>
            <div
              style={{
                flex: '1 1 50%',
              }}
            >
              <Paper
                elevation={3}
                style={{
                  height: 'calc(100% - 10px)',
                  margin: '5px',
                }}
              >
                {editMode === 'blocks' && <Builder setParser={setParser} />}
                {editMode === 'source' && <Editor setParser={setParser} />}
              </Paper>
            </div>
          </div>
        </div>
      </div>
    </MuiThemeProvider>
  );
}
