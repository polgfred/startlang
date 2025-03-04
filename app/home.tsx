'use client';

import { Paper, Stack, ThemeProvider, createTheme } from '@mui/material';
import { useEffect, useState } from 'react';

import { Interpreter } from '../src/lang/interpreter.js';

import Editor from './editor.jsx';
import { useEnvironment } from './environment.jsx';
import { useForceRender } from './force-render.js';
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
  const forceRender = useForceRender();

  const [showInspector, setShowInspector] = useState(true);

  const { interpreter, host } = useEnvironment();

  useEffect(() => {
    interpreter.events.on('run', forceRender);
    interpreter.events.on('exit', forceRender);
    interpreter.events.on('break', forceRender);
    interpreter.events.on('restore', forceRender);
    interpreter.events.on('error', forceRender);

    interpreter.events.on('error', (err) => {
      // eslint-disable-next-line no-console
      console.error(err.stack);
    });

    host.events.on('repaint', forceRender);
  }, [forceRender, host, interpreter]);

  const { inputState, promptForInput } = usePromptForInput();

  interpreter.registerGlobals({
    input: promptForInput,
  });

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
          showInspector={showInspector}
          setShowInspector={setShowInspector}
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
              <Editor showInspector={showInspector} />
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
                <Inspector />
              </Paper>
            </Stack>
          )}
        </Stack>
      </Stack>
    </ThemeProvider>
  );
}
