import { describe, expect, it } from 'vitest';
import { detectAll } from '@privacy-bridge/core';

describe('ACC-FND-007 denied network workflow', () => {
  it('runs product detection while socket APIs are denied', () => {
    const original = globalThis.fetch;
    globalThis.fetch = (() => {
      throw new Error('network forbidden');
    }) as typeof fetch;
    try {
      expect(detectAll('email: local@example.test').ok).toBe(true);
    } finally {
      globalThis.fetch = original;
    }
  });
});
