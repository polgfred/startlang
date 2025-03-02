'use client';

import { Paper, Stack, ThemeProvider, createTheme } from '@mui/material';
import { editor as ed } from 'monaco-editor';
import dynamic from 'next/dynamic';
import { useCallback, useEffect, useRef, useState } from 'react';

import { BrowserHost, browserGlobals } from '../src/lang/ext/browser.js';
import { Interpreter } from '../src/lang/interpreter.js';
import { parse } from '../src/lang/parser.peggy';
import type { MarkerType } from '../src/lang/types.js';

import { useForceRender } from './force-render.js';
import Graphics from './graphics.jsx';
import Header from './header.jsx';
import Inspector from './inspector.jsx';
import InterpreterProvider from './interpreter-context.jsx';
import Term from './term.jsx';

// editor component loads vscode monaco internally, so it can't be server-side rendered
const Editor = dynamic(() => import('./editor.jsx'), { ssr: false });

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

function usePromptForInput() {
  const [inputState, setInputState] = useState<{
    prompt: string;
    initial: string;
    onInputComplete: (value: string) => void;
  } | null>(null);

  return {
    inputState,

    promptForInput(
      interpreter: Interpreter,
      [prompt, initial = '']: [string, string]
    ) {
      return new Promise<void>((resolve) => {
        setInputState({
          prompt,
          initial,
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

export default function Home() {
  const editorRef = useRef<ed.ICodeEditor | null>(null);
  const { current: markers } = useRef<MarkerType[]>([]);

  const [showInspector, setShowInspector] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const forceRender = useForceRender();

  const { current: host } = useRef(new BrowserHost());
  const { current: interpreter } = useRef(new Interpreter(host));

  useEffect(() => {
    host.events.on('repaint', forceRender);
  }, [forceRender, host]);

  const { inputState, promptForInput } = usePromptForInput();

  interpreter.registerGlobals(browserGlobals);
  interpreter.registerGlobals({
    input: promptForInput,
  });

  const updateSlider = useCallback(
    (index: number) => {
      interpreter.moveToSnapshot(index);
      forceRender();
    },
    [forceRender, interpreter]
  );

  const runProgram = useCallback(async () => {
    setError(null);
    interpreter.clearHistory();
    host.clearDisplay();
    host.clearOutputBuffer();

    try {
      host.restoreOriginalSettings();
      const source = (editorRef.current?.getValue() ?? '') + '\n';
      const rootNode = parse(source);
      interpreter.setMarkers(rootNode, markers);
      await interpreter.run(rootNode);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err);
        // eslint-disable-next-line no-console
        console.error(err.stack);
      }
    } finally {
      forceRender();
    }
  }, [forceRender, host, interpreter, markers]);

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
        <InterpreterProvider interpreter={interpreter}>
          <Header
            showInspector={showInspector}
            setShowInspector={setShowInspector}
            editorRef={editorRef}
            runProgram={runProgram}
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
                  markers={markers}
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
              {host.viewMode === 'graphics' && (
                <Paper
                  elevation={3}
                  sx={{
                    height: '100%',
                    margin: '5px',
                    padding: '10px',
                    flex: 1,
                  }}
                >
                  <Graphics />
                </Paper>
              )}
              {host.viewMode === 'text' && (
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
                  <Term inputState={inputState} />
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
                    overflow: 'scroll',
                  }}
                >
                  <Inspector error={error} updateSlider={updateSlider} />
                </Paper>
              </Stack>
            )}
          </Stack>
        </InterpreterProvider>
      </Stack>
    </ThemeProvider>
  );
}
