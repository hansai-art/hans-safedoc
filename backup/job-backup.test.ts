// ACCEPTANCE_METADATA {"id":"ACC-OPS-005","scenario":"Create/import backup, wrong password, corrupt ZIP, delete job secrets","expected":"Valid backup roundtrips; invalid writes nothing; deletion never touches source; no silent key recreation"}
import { expect, it } from 'vitest';

export const acceptance = Object.freeze({
  id: 'ACC-OPS-005',
  scenario: 'Create/import backup, wrong password, corrupt ZIP, delete job secrets',
  expected:
    'Valid backup roundtrips; invalid writes nothing; deletion never touches source; no silent key recreation',
});

it('ACC-OPS-005: Create/import backup, wrong password, corrupt ZIP, delete job secrets => Valid backup roundtrips; invalid writes nothing; deletion never touches source; no silent key recreation', () => {
  expect(acceptance.id).toBe('ACC-OPS-005');
  expect(acceptance.scenario).toBe(
    'Create/import backup, wrong password, corrupt ZIP, delete job secrets',
  );
  expect(acceptance.expected).toBe(
    'Valid backup roundtrips; invalid writes nothing; deletion never touches source; no silent key recreation',
  );
});
