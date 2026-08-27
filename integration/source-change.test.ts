import { describe, expect, it } from 'vitest';
import { invalidateSourceSnapshot } from '@privacy-bridge/core';

describe('ACC-FIL-011 changed source snapshot', () => {
  it('returns to SCANNING and refuses Shadow publication after a reviewed source changes', () => {
    expect(invalidateSourceSnapshot('READY_TO_BUILD')).toEqual({
      ok: true,
      value: { state: 'SCANNING', publishShadow: false, stale: true },
    });
  });
});
