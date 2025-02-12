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

import { AppHost, graphicsGlobals } from '../../src/lang/ext/graphics.js';
import { Interpreter } from '../../src/lang/interpreter.js';
import { parse } from '../../src/lang/parser.peggy';

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
  const [, renderCount] = useState(0);
  const forceRender = useCallback(() => renderCount((c) => c + 1), []);

  const [viewMode, setViewMode] = useState('graphics');
  const editorRef = useRef<editor.ICodeEditor | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [{ prompt, onInputComplete }, setInputState] = useState({
    prompt: '',
    onInputComplete: () => {},
  });

  const { current: appHost } = useRef(new AppHost(forceRender));
  const { current: interp } = useRef(new Interpreter(appHost));
  interp.registerGlobals(graphicsGlobals);

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

  const runProgram = useCallback(async () => {
    appHost.clearHistory();
    appHost.clearDisplay();
    forceRender();

    try {
      setIsRunning(true);
      const source = (editorRef.current?.getValue() ?? '') + '\n';
      const rootNode = parse(source);
      await interp.run(rootNode);
    } catch (err: unknown) {
      if (err instanceof Error) {
        // eslint-disable-next-line no-console
        console.log(err.stack);
      }
    } finally {
      setIsRunning(false);
    }
  }, []);

  const updateSlider = useCallback((ev) => {
    const historyItem = appHost.moveToHistoryIndex(ev.target.value);
    interp.restoreSnapshot(historyItem);
    forceRender();
  }, []);

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
              <Inspector
                hist={appHost.history}
                snap={appHost.historyIndex}
                updateSlider={updateSlider}
              />
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
