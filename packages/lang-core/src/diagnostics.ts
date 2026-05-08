import type { SourceLocation } from './nodes/base.js';
import { parse } from './parser.peggy';

export type DiagnosticSeverity = 'error';

export interface SourceDiagnostic {
  readonly severity: DiagnosticSeverity;
  readonly message: string;
  readonly source: string;
  readonly location: SourceLocation | null;
}

interface ErrorWithLocation extends Error {
  readonly location?: SourceLocation;
}

function isSourcePosition(value: unknown) {
  return (
    typeof value === 'object' &&
    value !== null &&
    'line' in value &&
    typeof value.line === 'number' &&
    'column' in value &&
    typeof value.column === 'number'
  );
}

function readSourceLocation(err: Error) {
  if (!('location' in err)) {
    return null;
  }

  const location = (err as ErrorWithLocation).location;
  if (
    typeof location === 'object' &&
    location !== null &&
    isSourcePosition(location.start) &&
    isSourcePosition(location.end)
  ) {
    return location;
  }

  return null;
}

function createErrorDiagnostic(err: unknown): SourceDiagnostic {
  const error = err instanceof Error ? err : new Error(String(err));
  return {
    severity: 'error',
    message: error.message,
    source: 'Start',
    location: readSourceLocation(error),
  };
}

export function getSyntaxDiagnostics(
  source: string
): readonly SourceDiagnostic[] {
  try {
    parse(`${source}\n`);
    return [];
  } catch (err) {
    return [createErrorDiagnostic(err)];
  }
}
