import { Paper, Stack, ThemeProvider, createTheme } from '@mui/material';
import {
  BrowserHost,
  browserPresentationGlobals,
} from '@startlang/lang-browser/browser';
import { Interpreter } from '@startlang/lang-core/interpreter';
import { parse } from '@startlang/lang-core/parser.peggy';
import { runtimeEnvironmentGlobals } from '@startlang/lang-core/runtime-environment';
import { InputSuspension } from '@startlang/lang-core/suspension';
import { editor } from 'monaco-editor';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import Editor from './editor.jsx';
import Graphics from './graphics.jsx';
import Header from './header.jsx';
import Inspector from './inspector.jsx';
import Term from './term.jsx';

type OutputTab = 'graphics' | 'text';

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

function useForceRender() {
  const [, setTick] = useState(0);

  return useCallback(() => {
    setTick((tick) => tick + 1);
  }, []);
}

function chooseOutputTab(
  current: OutputTab,
  hasGraphicsOutput: boolean,
  hasTextOutput: boolean
) {
  if (current === 'graphics' && !hasGraphicsOutput && hasTextOutput) {
    return 'text';
  }
  if (current === 'text' && !hasTextOutput && hasGraphicsOutput) {
    return 'graphics';
  }
  return current;
}

export default function App() {
  const editorRef = useRef<editor.ICodeEditor | null>(null);

  const [outputTab, setOutputTab] = useState<OutputTab>('graphics');
  const [showInspector, setShowInspector] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const forceRender = useForceRender();

  const { current: host } = useRef(new BrowserHost());
  const { current: interpreter } = useRef(new Interpreter(host));

  useEffect(() => {
    host.events.addEventListener('repaint', forceRender);
    return () => {
      host.events.removeEventListener('repaint', forceRender);
    };
  }, [forceRender, host]);

  interpreter.registerGlobals(browserPresentationGlobals);
  interpreter.registerGlobals(runtimeEnvironmentGlobals());

  const syncOutputTab = useCallback(() => {
    const nextHasGraphicsOutput = host.shapes.length > 0;
    const nextHasTextOutput =
      host.outputBuffer.children.length > 0 ||
      interpreter.suspension instanceof InputSuspension;

    setOutputTab((current) =>
      chooseOutputTab(current, nextHasGraphicsOutput, nextHasTextOutput)
    );
  }, [host, interpreter]);

  const resumeInput = useCallback(
    async (value: string) => {
      setError(null);

      try {
        await interpreter.resumeSuspension(value);
      } catch (err: unknown) {
        if (err instanceof Error) {
          setError(err);
          // eslint-disable-next-line no-console
          console.error(err.stack);
        }
      } finally {
        syncOutputTab();
        forceRender();
      }
    },
    [forceRender, interpreter, syncOutputTab]
  );

  const inputState = useMemo(
    () =>
      interpreter.suspension instanceof InputSuspension
        ? {
            prompt: interpreter.suspension.prompt,
            initial: interpreter.suspension.initial,
            onInputComplete: resumeInput,
          }
        : null,
    [interpreter.suspension, resumeInput]
  );

  const hasGraphicsOutput = host.shapes.length > 0;
  const hasTextOutput =
    host.outputBuffer.children.length > 0 || inputState !== null;

  const updateSlider = useCallback(
    (index: number) => {
      interpreter.moveToSnapshot(index);
      syncOutputTab();
      forceRender();
    },
    [forceRender, interpreter, syncOutputTab]
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
      await interpreter.run(rootNode);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err);
        // eslint-disable-next-line no-console
        console.error(err.stack);
      }
    } finally {
      syncOutputTab();
      forceRender();
    }
  }, [forceRender, host, interpreter, syncOutputTab]);

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
          outputTab={outputTab}
          setOutputTab={setOutputTab}
          hasGraphicsOutput={hasGraphicsOutput}
          hasTextOutput={hasTextOutput}
          isProgramActive={interpreter.isRunning || interpreter.isSuspended}
          showInspector={showInspector}
          setShowInspector={setShowInspector}
          editorRef={editorRef}
          runProgram={runProgram}
        />
        <Stack
          direction="column"
          sx={{
            height: 'calc(100% - 66px)',
            minHeight: 0,
          }}
        >
          <Stack
            direction="row"
            sx={{
              flex: 1,
              minHeight: 0,
            }}
          >
            <Stack
              sx={{
                height: '100%',
                flex: 1,
                minWidth: 0,
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
                minWidth: 0,
                minHeight: 0,
              }}
            >
              <Paper
                elevation={3}
                sx={{
                  height: '100%',
                  margin: '5px',
                  padding: '10px',
                  flex: 1,
                  minHeight: 0,
                  overflow: outputTab === 'text' ? 'scroll' : 'hidden',
                }}
              >
                {outputTab === 'graphics' && <Graphics shapes={host.shapes} />}
                {outputTab === 'text' && (
                  <Term
                    outputBuffer={host.outputBuffer}
                    inputState={inputState}
                  />
                )}
              </Paper>
            </Stack>
          </Stack>
          {showInspector && (
            <Stack
              sx={{
                height: '32%',
                minHeight: 180,
                maxHeight: 360,
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
                <Inspector
                  error={error}
                  interpreter={interpreter}
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
