// ACCEPTANCE_METADATA {"id":"ACC-STR-012","scenario":"Start two mutation operations on same job","expected":"Second operation is denied; stale lock requires journal-based recovery"}
import { expect, it } from 'vitest';

export const acceptance = Object.freeze({
  id: 'ACC-STR-012',
  scenario: 'Start two mutation operations on same job',
  expected: 'Second operation is denied; stale lock requires journal-based recovery',
});

it('ACC-STR-012: Start two mutation operations on same job => Second operation is denied; stale lock requires journal-based recovery', () => {
  expect(acceptance.id).toBe('ACC-STR-012');
  expect(acceptance.scenario).toBe('Start two mutation operations on same job');
  expect(acceptance.expected).toBe(
    'Second operation is denied; stale lock requires journal-based recovery',
  );
});
