import { describe, expect, it } from 'vitest';
import { detectAll } from '@privacy-bridge/core';

describe('ACC-FND-004 core boundary', () => {
  it('imports and executes the core without Obsidian runtime globals', () => {
    expect(detectAll('email: fixture@example.test').ok).toBe(true);
    expect(globalThis).not.toHaveProperty('app');
  });
});
