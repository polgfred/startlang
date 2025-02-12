'use client';

import { type editor } from 'monaco-editor';
import {
  Grid2 as Grid,
  Paper,
  Stack,
  ThemeProvider,
  createTheme,
} from '@mui/material';
import { useCallback, useRef, useState } from 'react';

import { graphicsGlobals } from '../../src/lang/ext/graphics.js';
import { Interpreter } from '../../src/lang/interpreter.js';
import { parse } from '../../src/lang/parser.peggy';

import Editor from './editor.jsx';
import Graphics from './graphics.jsx';
import Header from './header.jsx';
import Inspector from './inspector.jsx';
import Term from './term.jsx';
import { useAppHost } from './use-app-host.js';

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
  const editorRef = useRef<editor.ICodeEditor | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [{ prompt, onInputComplete }, setInputState] = useState({
    prompt: '',
    onInputComplete: () => {},
  });
  const [{ hist, snap }, setHistory] = useState({
    hist: [] as any[],
    snap: 0,
  });

  const appHost = useAppHost();

  const refreshState = useCallback(() => {
    setHistory({ hist: [], snap: 0 });
    appHost.clearDisplay();
  }, []);

  const handleInput = useCallback(
    (input) => {
      if (onInputComplete) {
        onInputComplete(input);
        setInputState({
          prompt: '',
          onInputComplete: () => {},
        });
      }
    },
    [onInputComplete]
  );

  const updateSlider = useCallback((ev) => {
    // const snap = ev.target.value;
    // const current = hist[snap];
    // if (current) {
    //   setHistory({ hist, snap });
    //   setGfx(() => current.gfx);
    //   setBuf(() => current.buf);
    // }
  }, []);

  const runProgram = useCallback(async () => {
    refreshState();

    const hist = [] as any[];

    const interp = new Interpreter(appHost);
    interp.registerGlobals(graphicsGlobals);
    interp.registerGlobals({
      snapshot() {
        hist.push({
          ...interp.snapshot(),
          // gfx: gfx.current,
          // buf: buf.current,
        });

        setHistory({
          hist,
          snap: hist.length,
        });
      },
    });

    try {
      setIsRunning(true);
      const source = (editorRef.current?.getValue() ?? '') + '\n';
      const rootNode = parse(source);
      await interp.run(rootNode);
    } catch (err) {
      /* eslint-disable no-console */
      console.log(err.stack);
      console.log(interp.snapshot());
      /* eslint-enable no-console */
    } finally {
      setIsRunning(false);
    }
  }, [refreshState]);

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
          isRunning={isRunning}
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
                  <Graphics shapes={appHost.shapes} />
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
              <Editor editorRef={editorRef} />
            </Paper>
          </Grid>
        </Grid>
      </Stack>
    </ThemeProvider>
  );
}
