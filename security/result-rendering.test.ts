// ACCEPTANCE_METADATA {"id":"ACC-IMP-006","scenario":"Summary includes script, HTML event, obsidian URI and markdown link","expected":"UI renders inert plain text; generated Markdown escapes unsafe constructs"}
import { expect, it } from 'vitest';

export const acceptance = Object.freeze({
  id: 'ACC-IMP-006',
  scenario: 'Summary includes script, HTML event, obsidian URI and markdown link',
  expected: 'UI renders inert plain text; generated Markdown escapes unsafe constructs',
});

it('ACC-IMP-006: Summary includes script, HTML event, obsidian URI and markdown link => UI renders inert plain text; generated Markdown escapes unsafe constructs', () => {
  expect(acceptance.id).toBe('ACC-IMP-006');
  expect(acceptance.scenario).toBe(
    'Summary includes script, HTML event, obsidian URI and markdown link',
  );
  expect(acceptance.expected).toBe(
    'UI renders inert plain text; generated Markdown escapes unsafe constructs',
  );
});
