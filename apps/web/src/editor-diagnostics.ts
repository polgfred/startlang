import type { Monaco } from '@monaco-editor/react';
import {
  getSyntaxDiagnostics,
  type SourceDiagnostic,
} from '@startlang/lang-core/diagnostics';
import type { editor as MonacoEditor } from 'monaco-editor';

const syntaxMarkerOwner = 'start.syntax';
const syntaxValidationDelayMs = 150;

function clampLineNumber(model: MonacoEditor.ITextModel, lineNumber: number) {
  return Math.min(Math.max(1, lineNumber), model.getLineCount());
}

function clampColumn(
  model: MonacoEditor.ITextModel,
  lineNumber: number,
  column: number
) {
  return Math.min(Math.max(1, column), model.getLineMaxColumn(lineNumber));
}

function createMarker(
  diagnostic: SourceDiagnostic,
  model: MonacoEditor.ITextModel,
  monaco: Monaco
): MonacoEditor.IMarkerData {
  const { location } = diagnostic;

  if (!location) {
    return {
      severity: monaco.MarkerSeverity.Error,
      message: diagnostic.message,
      source: diagnostic.source,
      startLineNumber: 1,
      startColumn: 1,
      endLineNumber: 1,
      endColumn: model.getLineMaxColumn(1),
    };
  }

  const startLineNumber = clampLineNumber(model, location.start.line);
  const startColumn = clampColumn(
    model,
    startLineNumber,
    location.start.column
  );
  const endLineNumber = clampLineNumber(model, location.end.line);
  let endColumn = clampColumn(model, endLineNumber, location.end.column);

  if (startLineNumber === endLineNumber && endColumn <= startColumn) {
    endColumn = Math.min(
      startColumn + 1,
      model.getLineMaxColumn(startLineNumber)
    );
  }

  return {
    severity: monaco.MarkerSeverity.Error,
    message: diagnostic.message,
    source: diagnostic.source,
    startLineNumber,
    startColumn,
    endLineNumber,
    endColumn,
  };
}

function publishSyntaxMarkers(
  model: MonacoEditor.ITextModel,
  monaco: Monaco,
  diagnostics: readonly SourceDiagnostic[]
) {
  monaco.editor.setModelMarkers(
    model,
    syntaxMarkerOwner,
    diagnostics.map((diagnostic) => createMarker(diagnostic, model, monaco))
  );
}

export function createStartSyntaxValidator(
  editor: MonacoEditor.ICodeEditor,
  monaco: Monaco
) {
  const model = editor.getModel();
  let validationTimer: number | null = null;

  if (!model) {
    return {
      dispose: () => undefined,
    };
  }

  const textModel = model;

  function clearValidationTimer() {
    if (validationTimer !== null) {
      window.clearTimeout(validationTimer);
      validationTimer = null;
    }
  }

  function validate() {
    if (textModel.isDisposed()) {
      return;
    }

    const version = textModel.getVersionId();
    const diagnostics = getSyntaxDiagnostics(textModel.getValue());
    if (!textModel.isDisposed() && textModel.getVersionId() === version) {
      publishSyntaxMarkers(textModel, monaco, diagnostics);
    }
  }

  function scheduleValidation() {
    clearValidationTimer();
    validationTimer = window.setTimeout(validate, syntaxValidationDelayMs);
  }

  const contentChangeDisposable =
    textModel.onDidChangeContent(scheduleValidation);
  validate();

  return {
    dispose() {
      clearValidationTimer();
      contentChangeDisposable.dispose();
      if (!textModel.isDisposed()) {
        monaco.editor.setModelMarkers(textModel, syntaxMarkerOwner, []);
      }
    },
  };
}
