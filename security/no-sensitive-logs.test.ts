import { describe, expect, it, vi } from 'vitest';
import { detectAll } from '@privacy-bridge/core';

describe('ACC-FND-005 no sensitive logs', () => {
  it('processes canary secret without emitting it to console', () => {
    const canary = 'PB-CANARY-secret-7d88';
    const spy = vi.spyOn(console, 'log').mockImplementation(() => undefined);
    try {
      expect(detectAll(`password: ${canary}`).ok).toBe(true);
    } finally {
      spy.mockRestore();
    }
    expect(spy.mock.calls.flat().join(' ')).not.toContain(canary);
  });
});
