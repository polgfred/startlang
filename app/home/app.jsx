'use client';

import {
  Grid2 as Grid,
  Paper,
  Stack,
  ThemeProvider,
  createTheme,
} from '@mui/material';
import { useCallback, useMemo, useRef, useState } from 'react';

import { graphicsGlobals, graphicsProps } from '../../src/lang/graphics.js';
import { makeInterpreter } from '../../src/lang/interpreter.js';

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
  const [viewMode, setViewMode] = useState('graphics');
  const [parser, setParser] = useState(() => {});
  const [{ prompt, onInputComplete }, setInputState] = useState({});
  const [{ hist, snap }, setHistory] = useState({
    hist: [],
    snap: 0,
  });

  const [, setRenderCount] = useState(0);
  const forceRerender = useCallback(() => {
    setRenderCount((count) => count + 1);
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
    setHistory({ hist: [], snap: 0 });
    clearDisplay();
  }, [clearDisplay]);

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

    const hist = [];

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

    try {
      await interp.run(parser());
    } catch (err) {
      /* eslint-disable no-console */
      console.log(err.stack);
      console.log(interp.snapshot());
      /* eslint-enable no-console */
    }
  }, [refreshState, bindings, gfx, buf, parser]);

  return (
    <ThemeProvider theme={theme}>
      <Stack
        direction="column"
        sx={(theme) => ({
          backgroundColor: theme.palette.background.default,
          width: '100vw',
          height: '100vh',
        })}
      >
        <Header
          viewMode={viewMode}
          updateViewMode={setViewMode}
          runProgram={runProgram}
        />
        <Grid
          container
          sx={{
            height: 'calc(100% - 65px)',
            marginTop: '65px',
          }}
        >
          <Grid
            size={4}
            sx={{
              height: '100%',
            }}
          >
            <Stack
              direction="column"
              sx={{
                height: '100%',
              }}
            >
              {viewMode === 'graphics' && (
                <Paper
                  elevation={3}
                  sx={{
                    height: 'calc(100% - 30px)',
                    margin: '5px',
                    padding: '10px',
                    flex: 3,
                  }}
                >
                  <Graphics shapes={gfx.current.shapes} />
                </Paper>
              )}
              {viewMode === 'text' && (
                <Paper
                  elevation={3}
                  sx={{
                    height: 'calc(100% - 30px)',
                    margin: '5px',
                    padding: '10px',
                    flex: 1,
                  }}
                >
                  <Term
                    buf={buf.current}
                    prompt={prompt}
                    handleInput={handleInput}
                  />
                </Paper>
              )}
            </Stack>
          </Grid>
          <Grid
            size={4}
            sx={{
              height: '100%',
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
              <Inspector hist={hist} snap={snap} updateSlider={updateSlider} />
            </Paper>
          </Grid>
          <Grid
            size={4}
            sx={{
              height: '100%',
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
              <Editor setParser={setParser} />
            </Paper>
          </Grid>
        </Grid>
      </Stack>
    </ThemeProvider>
  );
}
