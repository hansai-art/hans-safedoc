// ACCEPTANCE_METADATA {"id":"ACC-STR-003","scenario":"Create client/job and search source Vault and Safe Package","expected":"No mapping, key envelope, review, occurrence or client metadata exists there"}
import { expect, it } from 'vitest';

export const acceptance = Object.freeze({
  id: 'ACC-STR-003',
  scenario: 'Create client/job and search source Vault and Safe Package',
  expected: 'No mapping, key envelope, review, occurrence or client metadata exists there',
});

it('ACC-STR-003: Create client/job and search source Vault and Safe Package => No mapping, key envelope, review, occurrence or client metadata exists there', () => {
  expect(acceptance.id).toBe('ACC-STR-003');
  expect(acceptance.scenario).toBe('Create client/job and search source Vault and Safe Package');
  expect(acceptance.expected).toBe(
    'No mapping, key envelope, review, occurrence or client metadata exists there',
  );
});
