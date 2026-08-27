import { randomBytes } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { createEntityId, escapeResultMarkdown, restoreText, tokenFor } from '@privacy-bridge/core';
describe('E12 Result restore', () =>
  it('escapes hostile Markdown and restores only known tokens', () => {
    const key = randomBytes(32),
      token = tokenFor(key, 'job', 'PERSON', createEntityId());
    expect(escapeResultMarkdown('<script>obsidian://x</script>')).not.toContain('<');
    expect(restoreText(token, [{ token, preferredDisplay: 'Alice' }]).ok).toBe(true);
  }));
