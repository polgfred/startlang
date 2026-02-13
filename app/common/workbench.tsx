'use client';

import { Paper, Stack, ThemeProvider, createTheme } from '@mui/material';
import { editor } from 'monaco-editor';
import { ReactNode, RefObject } from 'react';

import type { EngineSnapshotState } from '../../src/desktop/types.js';
import Editor from '../editor.jsx';
import Graphics from '../graphics.jsx';
import Inspector from '../inspector.jsx';
import Term, { type InputState } from '../term.jsx';

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

export default function Workbench({
  header,
  state,
  error,
  showInspector,
  updateSlider,
  editorRef,
  runProgram,
  inputState,
}: {
  header: ReactNode;
  state: EngineSnapshotState | null;
  error: Error | null;
  showInspector: boolean;
  updateSlider: (index: number) => void | Promise<void>;
  editorRef: RefObject<editor.ICodeEditor | null>;
  runProgram: () => void | Promise<void>;
  inputState: InputState | null;
}) {
  const viewMode = state?.viewMode ?? 'graphics';

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
        {header}
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
                  flex: 1,
                }}
              >
                <Graphics shapes={state?.shapes ?? []} />
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
                <Term outputBuffer={state?.output ?? null} inputState={inputState} />
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
                <Inspector error={error} state={state} updateSlider={updateSlider} />
              </Paper>
            </Stack>
          )}
        </Stack>
      </Stack>
    </ThemeProvider>
  );
}
