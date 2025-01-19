import { Paper } from '@mui/material';
import { ThemeProvider, createTheme } from '@mui/material/styles/index.js';
import { useCallback, useMemo, useState } from 'react';

import { graphicsGlobals, graphicsProps } from '../lang/graphics.js';
import { makeInterpreter } from '../lang/interpreter.js';

import Builder from './builder.jsx';
import Editor from './editor.jsx';
import Graphics from './graphics.jsx';
import Header from './header.jsx';
import Term from './term.jsx';
// import Inspector from './inspector.jsx';

const theme = createTheme({
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
  const [viewMode, setViewMode] = useState('split');
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
  }, [clearDisplay]);

  const clearHistory = useCallback(() => {
    // setHistory({ hist: [], snap: 0 });
  }, []);

  const handleInput = useCallback(
    (input) => {
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

  const runProgram = useCallback(async () => {
    refreshState();
    clearHistory();

    const interp = makeInterpreter();
    interp.registerGlobals(graphicsGlobals(bindings));

    try {
      await interp.run(parser());
      console.log('done'); // eslint-disable-line no-console
      console.log(interp.snapshot()); // eslint-disable-line no-console
    } catch (err) {
      console.log(err.stack); // eslint-disable-line no-console
      console.log(interp.snapshot()); // eslint-disable-line no-console
    }
  }, [parser, bindings, refreshState, clearHistory]);

  const inspect = false;

  return (
    <ThemeProvider theme={theme}>
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
    </ThemeProvider>
  );
}
