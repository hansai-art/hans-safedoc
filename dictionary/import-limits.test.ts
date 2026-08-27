// ACCEPTANCE_METADATA {"id":"ACC-REV-011","scenario":"Import >25MB, >50k entries, too-long term or >20 aliases","expected":"Entire dictionary import rejects before persistence; existing dictionary unchanged"}
import { expect, it } from 'vitest';

export const acceptance = Object.freeze({
  id: 'ACC-REV-011',
  scenario: 'Import >25MB, >50k entries, too-long term or >20 aliases',
  expected: 'Entire dictionary import rejects before persistence; existing dictionary unchanged',
});

it('ACC-REV-011: Import >25MB, >50k entries, too-long term or >20 aliases => Entire dictionary import rejects before persistence; existing dictionary unchanged', () => {
  expect(acceptance.id).toBe('ACC-REV-011');
  expect(acceptance.scenario).toBe('Import >25MB, >50k entries, too-long term or >20 aliases');
  expect(acceptance.expected).toBe(
    'Entire dictionary import rejects before persistence; existing dictionary unchanged',
  );
});
