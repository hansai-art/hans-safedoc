import { expect, it } from 'vitest';
import { decideRecovery, isStaleLock } from '@privacy-bridge/core';

it('ACC-OPS-003: defaults all incomplete journal phases to rollback and requires verified roll-forward', () => {
  for (const phase of [
    'PREPARED',
    'WRITING_TEMP',
    'TEMP_VALIDATED',
    'SWAP_PENDING',
    'SWAPPED',
    'POST_VALIDATION',
    'ROLLBACK_PENDING',
    'ROLLED_BACK',
  ] as const)
    expect(decideRecovery(phase, false)).toBe('ROLLBACK');
  expect(decideRecovery('SWAPPED', true, 'ROLL_FORWARD')).toBe('ROLL_FORWARD');
  expect(
    isStaleLock(
      { heartbeatAt: '2026-08-28T00:00:00.000Z' },
      new Date('2026-08-28T00:01:01.000Z'),
      false,
      false,
    ),
  ).toBe(true);
});
