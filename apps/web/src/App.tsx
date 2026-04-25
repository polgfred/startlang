import { Paper, Stack, ThemeProvider, createTheme } from '@mui/material';

import Editor from './editor.jsx';
import Graphics from './graphics.jsx';
import Header from './header.jsx';
import Inspector from './inspector.jsx';
import { useStartEnvironment } from './start-environment.js';
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
      main: '#455a64',
    },
  },
});

const appGap = 1.25;

const panelSx = {
  display: 'flex',
  flexDirection: 'column',
  flex: 1,
  minHeight: 0,
  p: 2,
};

export default function App() {
  const env = useStartEnvironment();

  return (
    <ThemeProvider theme={theme}>
      <Stack
        direction="column"
        sx={(theme) => ({
          backgroundColor: theme.palette.background.default,
          width: '100%',
          height: '100%',
          minHeight: 0,
        })}
      >
        <Header
          outputTab={env.outputTab}
          setOutputTab={env.setOutputTab}
          hasGraphicsOutput={env.hasGraphicsOutput}
          hasTextOutput={env.hasTextOutput}
          isProgramActive={env.isRunDisabled}
          showInspector={env.showInspector}
          setShowInspector={env.setShowInspector}
          runProgram={env.runOrResume}
          runLabel={env.runLabel}
          stopProgram={env.stopProgram}
          isStopDisabled={env.isStopDisabled}
        />
        <Stack
          direction="column"
          sx={{
            flex: 1,
            minHeight: 0,
            p: 0.625,
            gap: appGap,
          }}
        >
          <Stack
            direction="row"
            sx={{
              flex: 1,
              minHeight: 0,
              gap: appGap,
            }}
          >
            <Stack
              sx={{
                flex: 1,
                minWidth: 0,
                minHeight: 0,
              }}
            >
              <Paper elevation={3} sx={panelSx}>
                <Editor
                  showInspector={env.showInspector}
                  runProgram={env.runOrResume}
                  isReadOnly={env.isEditorReadOnly}
                />
              </Paper>
            </Stack>
            <Stack
              sx={{
                flex: 1,
                minWidth: 0,
                minHeight: 0,
              }}
            >
              <Paper
                elevation={3}
                sx={{
                  ...panelSx,
                  overflow: env.outputTab === 'text' ? 'scroll' : 'hidden',
                }}
              >
                {env.outputTab === 'graphics' && (
                  <Graphics shapes={env.host.shapes} />
                )}
                {env.outputTab === 'text' && (
                  <Term
                    outputBuffer={env.host.outputBuffer}
                    inputState={env.inputState}
                  />
                )}
              </Paper>
            </Stack>
          </Stack>
          {env.showInspector && (
            <Stack
              sx={{
                height: '32%',
                minHeight: 180,
                maxHeight: 360,
                minWidth: 0,
              }}
            >
              <Paper
                elevation={3}
                sx={{
                  ...panelSx,
                  overflow: 'hidden',
                }}
              >
                <Inspector
                  error={env.error}
                  interpreter={env.interpreter}
                  updateSlider={env.updateSlider}
                />
              </Paper>
            </Stack>
          )}
        </Stack>
      </Stack>
    </ThemeProvider>
  );
}
