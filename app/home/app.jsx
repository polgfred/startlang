'use client';

import { Paper, ThemeProvider, createTheme } from '@mui/material';
import { useCallback, useMemo, useRef, useState } from 'react';

import { graphicsGlobals, graphicsProps } from '../../src/lang/graphics.js';
import { makeInterpreter } from '../../src/lang/interpreter.js';

import Builder from './builder.jsx';
import Editor from './editor.jsx';
import Graphics from './graphics.jsx';
import Header from './header.jsx';
import Inspector from './inspector.jsx';
import Term from './term.jsx';

const theme = createTheme({
  palette: {
    primary: {
      main: '#6b9da0',
    },
    secondary: {
      main: '#ffffff',
    },
  },
});

export default function App() {
  const [viewMode, setViewMode] = useState('split');
  const [editMode, setEditMode] = useState('source');
  const [parser, setParser] = useState(() => {});
  const [{ prompt, onInputComplete }, setInputState] = useState({});
  const [{ hist, snap }, setHistory] = useState({
    hist: [],
    snap: 0,
  });

  const [, setRenderCount] = useState(0);
  const forceRerender = useCallback((count) => {
    setRenderCount(count + 1);
  }, []);

  const gfx = useRef(graphicsProps);
  const setGfx = useCallback(
    (mut) => {
      gfx.current = mut(gfx.current);
      forceRerender();
    },
    [forceRerender]
  );

  const buf = useRef([]);
  const setBuf = useCallback(
    (mut) => {
      buf.current = mut(buf.current);
      forceRerender();
    },
    [forceRerender]
  );

  const clearDisplay = useCallback(() => {
    setGfx(() => graphicsProps);
    setBuf(() => []);
  }, [setBuf, setGfx]);

  const refreshState = useCallback(() => {
    clearDisplay();
  }, [clearDisplay]);

  const clearHistory = useCallback(() => {
    setHistory({ hist: [], snap: 0 });
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

  const updateSlider = useCallback(
    (ev) => {
      const snap = ev.target.value;
      const current = hist[snap];

      if (current) {
        setHistory({ hist, snap });
        setGfx(() => current.gfx);
        setBuf(() => current.buf);
      }
    },
    [hist, setBuf, setGfx]
  );

  const bindings = useMemo(
    () => ({
      clearDisplay,
      setGfx,
      setBuf,
      setInputState,
    }),
    [clearDisplay, setBuf, setGfx]
  );

  const runProgram = useCallback(async () => {
    refreshState();
    clearHistory();

    const interp = makeInterpreter();
    interp.registerGlobals(graphicsGlobals(bindings));
    interp.registerGlobals({
      snapshot() {
        hist.push({
          ...interp.snapshot(),
          gfx: gfx.current,
          buf: buf.current,
        });

        setHistory({
          hist,
          snap: hist.length,
        });
      },
    });

    /* eslint-disable no-console */
    try {
      await interp.run(parser());
      console.log('done');
      console.log(interp.snapshot());
    } catch (err) {
      console.log(err.stack);
      console.log(interp.snapshot());
    }
    /* eslint-enable no-console */
  }, [refreshState, clearHistory, bindings, hist, gfx, buf, parser]);

  const inspect = true;

  return (
    <ThemeProvider theme={theme}>
      <div
        sx={(theme) => ({
          backgroundColor: theme.palette.background.default,
          display: 'flex',
          flexDirection: 'row',
          width: '100vw',
          height: '100vh',
        })}
      >
        <div
          sx={{
            height: '100vh',
            display: 'flex',
            flexDirection: 'column',
            flex: 1,
          }}
        >
          <div
            sx={{
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
            sx={{
              display: 'flex',
              flexDirection: 'row',
              flex: '1 1 auto',
            }}
          >
            <div
              sx={{
                display: 'flex',
                flexDirection: 'column',
                flex: '1 1 50%',
              }}
            >
              {viewMode !== 'text' && (
                <div
                  sx={{
                    flex: '1 1 75%',
                  }}
                >
                  <Paper
                    elevation={3}
                    sx={{
                      height: 'calc(100% - 30px)',
                      margin: '5px',
                      padding: '10px',
                    }}
                  >
                    <Graphics shapes={gfx.current.shapes} />
                  </Paper>
                </div>
              )}
              {viewMode !== 'graphics' && (
                <div
                  sx={{
                    flex: '1 1 25%',
                  }}
                >
                  <Paper
                    elevation={3}
                    sx={{
                      height: 'calc(100% - 30px)',
                      margin: '5px',
                      padding: '10px',
                    }}
                  >
                    <Term
                      buf={buf.current}
                      prompt={prompt}
                      handleInput={handleInput}
                    />
                  </Paper>
                </div>
              )}
              {inspect && (
                <div
                  sx={{
                    flex: '1 1 auto',
                  }}
                >
                  <Paper
                    elevation={3}
                    sx={{
                      height: 'calc(100% - 30px)',
                      margin: '5px',
                      padding: '10px',
                    }}
                  >
                    <Inspector
                      hist={hist}
                      snap={snap}
                      updateSlider={updateSlider}
                    />
                  </Paper>
                </div>
              )}
            </div>
            <div
              sx={{
                flex: '1 1 50%',
              }}
            >
              <Paper
                elevation={3}
                sx={{
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
