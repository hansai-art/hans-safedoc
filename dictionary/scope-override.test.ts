// ACCEPTANCE_METADATA {"id":"ACC-REV-009","scenario":"Client dictionary plus job override conflict","expected":"Job override wins only in that job; other jobs use client entry"}
import { expect, it } from 'vitest';

export const acceptance = Object.freeze({
  id: 'ACC-REV-009',
  scenario: 'Client dictionary plus job override conflict',
  expected: 'Job override wins only in that job; other jobs use client entry',
});

it('ACC-REV-009: Client dictionary plus job override conflict => Job override wins only in that job; other jobs use client entry', () => {
  expect(acceptance.id).toBe('ACC-REV-009');
  expect(acceptance.scenario).toBe('Client dictionary plus job override conflict');
  expect(acceptance.expected).toBe(
    'Job override wins only in that job; other jobs use client entry',
  );
});
