import { expect, it } from 'vitest';
import { escapeResultMarkdown } from '@privacy-bridge/core';

it('ACC-IMP-006: renders script, event HTML, Obsidian URI and Markdown links as inert text', () => {
  const rendered = escapeResultMarkdown(
    '<img onerror=alert(1)> obsidian://open [run](https://bad.example)',
  );
  expect(rendered).toBe('&lt;img onerror=alert(1)&gt; obsidian&#58;//open \\[run\\]');
});
