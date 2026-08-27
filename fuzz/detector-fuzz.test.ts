import { expect, it } from 'vitest';
import { detectAll } from '@privacy-bridge/core';
it('ACC-DET-020 terminates and emits valid spans for adversarial Unicode', () => {
  for (const unit of ['😀', 'e\u0301', '\uD800', '字']) {
    const source = `${unit.repeat(200)}\n密碼：secret123\n${unit.repeat(200)}`;
    const result = detectAll(source);
    expect(result.ok).toBe(true);
    if (result.ok)
      for (const c of result.value) expect(source.slice(c.start, c.end)).toBe(c.surfaceText);
  }
});
