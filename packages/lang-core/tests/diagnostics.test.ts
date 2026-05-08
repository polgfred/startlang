import { describe, expect, it } from 'vitest';

import { getSyntaxDiagnostics } from '../src/diagnostics.js';

describe('syntax diagnostics', () => {
  it('returns no diagnostics for valid source', () => {
    expect(getSyntaxDiagnostics('print "hello"')).toEqual([]);
  });

  it('returns an error diagnostic with source location for invalid source', () => {
    const [diagnostic] = getSyntaxDiagnostics('print (');

    expect(diagnostic).toMatchObject({
      severity: 'error',
      source: 'Start',
    });
    expect(diagnostic?.message).not.toBe('');
    expect(diagnostic?.location?.start.line).toBeGreaterThan(0);
    expect(diagnostic?.location?.start.column).toBeGreaterThan(0);
  });
});
