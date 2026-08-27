import { describe, expect, it } from 'vitest';
import { detectAll } from '@privacy-bridge/core';

describe('E04 detection safety defaults', () => {
  it('captures secret values only and marks them BLOCK_EXPORT', () => {
    const result = detectAll('password: password\nemail: test@example.com.tw');
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.map((candidate) => [candidate.surfaceText, candidate.handling])).toEqual([
      ['password', 'BLOCK_EXPORT'],
      ['test@example.com.tw', 'TOKENIZE'],
    ]);
  });
  it('does not contaminate same-line context across lines and classifies 099 as service', () => {
    const result = detectAll('passport:\nAB1234567\n099-123-4567');
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.some((candidate) => candidate.primaryType === 'TW_PASSPORT')).toBe(false);
    expect(result.value.some((candidate) => candidate.primaryType === 'TW_PHONE_SERVICE')).toBe(
      true,
    );
  });
});
