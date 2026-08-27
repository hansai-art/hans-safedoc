import { expect, it } from 'vitest';
import { mergeDictionaries } from '@privacy-bridge/core';
it('ACC-REV-009 applies a job override without changing another job client dictionary', () => {
  const client = { entries: [{ term: 'Acme', type: 'ORGANIZATION' as const }] };
  const override = { entries: [{ term: 'Acme', type: 'PROJECT' as const }] };
  expect(mergeDictionaries(client, override).entries[0]?.type).toBe('PROJECT');
  expect(client.entries[0]?.type).toBe('ORGANIZATION');
});
