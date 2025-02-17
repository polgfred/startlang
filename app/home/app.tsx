'use client';

import { Paper, Stack, ThemeProvider, createTheme } from '@mui/material';
import { editor } from 'monaco-editor';
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
  components: {
    MuiStack: {
      defaultProps: {
        useFlexGap: true,
      },
    },
  },
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
  const [showInspector, setShowInspector] = useState(true);
  const [isRunning, setIsRunning] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const forceRender = useForceRender();

  const { current: host } = useRef(new BrowserHost(forceRender));
  const { current: interpreter } = useRef(new Interpreter(host));
  const { current: history } = useRef(new History(interpreter, host));

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

  const updateSlider = useCallback(
    (index: number) => {
      history.moveToIndex(index);
      forceRender();
    },
    [forceRender, history]
  );

  const runProgram = useCallback(async () => {
    setError(null);
    history.clear();
    host.clearDisplay();
    host.clearOutputBuffer();
    forceRender();

    try {
      setIsRunning(true);
      const source = (editorRef.current?.getValue() ?? '') + '\n';
      const rootNode = parse(source);
      await interpreter.run(rootNode);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err);
        // eslint-disable-next-line no-console
        console.error(err.stack);
      }
    } finally {
      setIsRunning(false);
    }
  }, [forceRender, history, host, interpreter]);

  return (
    <ThemeProvider theme={theme}>
      <Stack
        direction="column"
        sx={(theme) => ({
          backgroundColor: theme.palette.background.default,
          width: '100%',
          height: '100%',
        })}
      >
        <Header
          viewMode={viewMode}
          updateViewMode={setViewMode}
          showInspector={showInspector}
          setShowInspector={setShowInspector}
          runProgram={runProgram}
          isRunning={isRunning}
        />
        <Stack
          direction="row"
          sx={{
            height: 'calc(100% - 66px)',
          }}
        >
          <Stack
            sx={{
              height: '100%',
              flex: 1,
            }}
          >
            <Paper
              elevation={3}
              sx={{
                height: '100%',
                margin: '5px',
                padding: '10px',
              }}
            >
              <Editor
                editorRef={editorRef}
                showInspector={showInspector}
                runProgram={runProgram}
              />
            </Paper>
          </Stack>
          <Stack
            sx={{
              height: '100%',
              flex: 1,
            }}
          >
            {viewMode === 'graphics' && (
              <Paper
                elevation={3}
                sx={{
                  height: '100%',
                  margin: '5px',
                  padding: '10px',
                  overflow: 'scroll',
                  flex: 1,
                }}
              >
                <Graphics shapes={host.shapes} />
              </Paper>
            )}
            {viewMode === 'text' && (
              <Paper
                elevation={3}
                sx={{
                  height: '100%',
                  margin: '5px',
                  padding: '10px',
                  overflow: 'scroll',
                  flex: 1,
                }}
              >
                <Term
                  outputBuffer={host.outputBuffer}
                  inputState={inputState}
                />
              </Paper>
            )}
          </Stack>
          {showInspector && (
            <Stack
              sx={{
                height: '100%',
                flex: 1,
              }}
            >
              <Paper
                elevation={3}
                sx={{
                  height: '100%',
                  margin: '5px',
                  padding: '10px',
                }}
              >
                <Inspector
                  error={error}
                  history={history}
                  updateSlider={updateSlider}
                />
              </Paper>
            </Stack>
          )}
        </Stack>
      </Stack>
    </ThemeProvider>
  );
}
