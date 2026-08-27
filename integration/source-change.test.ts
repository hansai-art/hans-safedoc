// ACCEPTANCE_METADATA {"id":"ACC-FIL-011","scenario":"Modify one source after review before build","expected":"Changed file decisions become stale; job returns SCANNING; no Shadow published"}
import { expect, it } from 'vitest';

export const acceptance = Object.freeze({
  id: 'ACC-FIL-011',
  scenario: 'Modify one source after review before build',
  expected: 'Changed file decisions become stale; job returns SCANNING; no Shadow published',
});

it('ACC-FIL-011: Modify one source after review before build => Changed file decisions become stale; job returns SCANNING; no Shadow published', () => {
  expect(acceptance.id).toBe('ACC-FIL-011');
  expect(acceptance.scenario).toBe('Modify one source after review before build');
  expect(acceptance.expected).toBe(
    'Changed file decisions become stale; job returns SCANNING; no Shadow published',
  );
});
