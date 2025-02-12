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

import { BrowserHost, browserGlobals } from '../../src/lang/ext/browser.js';
import { History } from '../../src/lang/ext/history.js';
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

function useForceRender() {
  const [, setTick] = useState(0);
  return () => {
    setTick((tick) => tick + 1);
  };
}

function usePromptForInput() {
  const [inputState, setInputState] = useState<{
    prompt: string;
    onInputComplete: (value: string) => void;
  } | null>(null);

  return {
    inputState,

    promptForInput(interpreter: Interpreter, [prompt]: [string]) {
      return new Promise<void>((resolve) => {
        setInputState({
          prompt,
          onInputComplete(value: string) {
            setInputState(null);
            interpreter.setResult(value);
            resolve();
          },
        });
      });
    },
  };
}

export default function App() {
  const editorRef = useRef<editor.ICodeEditor | null>(null);

  const [viewMode, setViewMode] = useState<'graphics' | 'text'>('graphics');
  const [isRunning, setIsRunning] = useState(false);

  const forceRender = useForceRender();

  const { current: appHost } = useRef(new BrowserHost(forceRender));
  const { current: interpreter } = useRef(new Interpreter(appHost));
  const { current: history } = useRef(new History(interpreter, appHost));

  const { inputState, promptForInput } = usePromptForInput();

  interpreter.registerGlobals(browserGlobals);
  interpreter.registerGlobals({
    input: promptForInput,
    mode(_, [mode]: [string]) {
      if (mode !== 'graphics' && mode !== 'text') {
        throw new Error(`invalid mode: ${mode}`);
      }
      setViewMode(mode);
    },
    snapshot() {
      history.push();
    },
  });

  const updateSlider = useCallback((index: number) => {
    history.moveToIndex(index);
    forceRender();
  }, []);

  const runProgram = useCallback(async () => {
    history.clear();
    appHost.clearDisplay();
    appHost.clearTextBuffer();
    forceRender();

    try {
      setIsRunning(true);
      const source = (editorRef.current?.getValue() ?? '') + '\n';
      const rootNode = parse(source);
      await interpreter.run(rootNode);
    } catch (err: unknown) {
      if (err instanceof Error) {
        console.error(err.stack);
      }
    } finally {
      setIsRunning(false);
    }
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
                    textBuffer={appHost.textBuffer}
                    inputState={inputState}
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
              {!history.isEmpty() && (
                <Inspector history={history} updateSlider={updateSlider} />
              )}
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
