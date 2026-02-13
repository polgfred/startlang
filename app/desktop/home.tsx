'use client';

import { editor } from 'monaco-editor';
import { useCallback, useEffect, useRef, useState } from 'react';

import type {
  EngineRunResult,
  EngineSnapshotState,
  TraceBundle,
  ViewMode,
} from '../../src/desktop/types.js';
import Workbench from '../common/workbench.jsx';

import HeaderDesktop from './header.jsx';

function toError(errorState: EngineRunResult['error']) {
  if (!errorState) {
    return null;
  }
  const error = new Error(errorState.message);
  if (errorState.stack) {
    error.stack = errorState.stack;
  }
  return error;
}

export default function HomeDesktop() {
  const editorRef = useRef<editor.ICodeEditor | null>(null);
  const desktopApi = typeof window !== 'undefined' ? window.startlangDesktop : undefined;

  const [showInspector, setShowInspector] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [state, setState] = useState<EngineSnapshotState | null>(null);
  const [recentFiles, setRecentFiles] = useState<string[]>([]);
  const [currentFilePath, setCurrentFilePath] = useState<string | null>(null);

  useEffect(() => {
    if (!desktopApi) {
      return;
    }
    void desktopApi.files.listRecent().then(setRecentFiles);
  }, [desktopApi]);

  const refreshRecentFiles = useCallback(async () => {
    if (!desktopApi) {
      return;
    }
    setRecentFiles(await desktopApi.files.listRecent());
  }, [desktopApi]);

  const getSource = useCallback(() => {
    return editorRef.current?.getValue() ?? '';
  }, []);

  const setSource = useCallback((source: string) => {
    editorRef.current?.setValue(source);
  }, []);

  const runProgram = useCallback(async () => {
    if (!desktopApi) {
      return;
    }

    setError(null);
    setIsRunning(true);

    try {
      const result = await desktopApi.engine.run(getSource());
      setState(result.state);
      setError(toError(result.error));
    } finally {
      setIsRunning(false);
    }
  }, [desktopApi, getSource]);

  const updateSlider = useCallback(
    async (index: number) => {
      if (!desktopApi) {
        return;
      }
      const result = await desktopApi.engine.moveToSnapshot(index);
      setState(result.state);
      setError(toError(result.error));
    },
    [desktopApi]
  );

  const handleSetViewMode = useCallback((mode: ViewMode) => {
    setState((prev) => (prev ? { ...prev, viewMode: mode } : prev));
  }, []);

  const openFile = useCallback(async () => {
    if (!desktopApi) {
      return;
    }
    const result = await desktopApi.files.open();
    if (!result) {
      return;
    }
    setCurrentFilePath(result.filePath);
    setSource(result.content);
    await refreshRecentFiles();
    await runProgram();
  }, [desktopApi, refreshRecentFiles, runProgram, setSource]);

  const openRecentFile = useCallback(
    async (filePath: string) => {
      if (!desktopApi) {
        return;
      }
      const result = await desktopApi.files.readRecent(filePath);
      setCurrentFilePath(result.filePath);
      setSource(result.content);
      await refreshRecentFiles();
      await runProgram();
    },
    [desktopApi, refreshRecentFiles, runProgram, setSource]
  );

  const saveFileAs = useCallback(async () => {
    if (!desktopApi) {
      return;
    }
    const result = await desktopApi.files.saveAs(getSource());
    if (!result) {
      return;
    }
    setCurrentFilePath(result.filePath);
    await refreshRecentFiles();
  }, [desktopApi, getSource, refreshRecentFiles]);

  const saveFile = useCallback(async () => {
    if (!desktopApi) {
      return;
    }
    const source = getSource();
    if (!currentFilePath) {
      await saveFileAs();
      return;
    }
    await desktopApi.files.save(currentFilePath, source);
    await refreshRecentFiles();
  }, [currentFilePath, desktopApi, getSource, refreshRecentFiles, saveFileAs]);

  const exportTrace = useCallback(async () => {
    if (!desktopApi) {
      return;
    }
    const traceBundle: TraceBundle = await desktopApi.engine.exportTrace();
    await desktopApi.files.saveTraceBundle(JSON.stringify(traceBundle, null, 2));
  }, [desktopApi]);

  return (
    <Workbench
      header={
        <HeaderDesktop
          viewMode={state?.viewMode ?? 'graphics'}
          setViewMode={handleSetViewMode}
          isRunning={isRunning}
          currentFilePath={currentFilePath}
          recentFiles={recentFiles}
          openFile={openFile}
          openRecentFile={openRecentFile}
          saveFile={saveFile}
          saveFileAs={saveFileAs}
          exportTrace={exportTrace}
          showInspector={showInspector}
          setShowInspector={setShowInspector}
          editorRef={editorRef}
          runProgram={runProgram}
        />
      }
      state={state}
      error={error}
      showInspector={showInspector}
      updateSlider={updateSlider}
      editorRef={editorRef}
      runProgram={runProgram}
      inputState={null}
    />
  );
}
