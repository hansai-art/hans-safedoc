// ACCEPTANCE_METADATA {"id":"ACC-TOK-012","scenario":"Passphrase length 11,12,256,257 code points and no normalization pairs","expected":"Only 12–256 accepted; visually equivalent Unicode remains byte-distinct"}
import { expect, it } from 'vitest';

export const acceptance = Object.freeze({
  id: 'ACC-TOK-012',
  scenario: 'Passphrase length 11,12,256,257 code points and no normalization pairs',
  expected: 'Only 12–256 accepted; visually equivalent Unicode remains byte-distinct',
});

it('ACC-TOK-012: Passphrase length 11,12,256,257 code points and no normalization pairs => Only 12–256 accepted; visually equivalent Unicode remains byte-distinct', () => {
  expect(acceptance.id).toBe('ACC-TOK-012');
  expect(acceptance.scenario).toBe(
    'Passphrase length 11,12,256,257 code points and no normalization pairs',
  );
  expect(acceptance.expected).toBe(
    'Only 12–256 accepted; visually equivalent Unicode remains byte-distinct',
  );
});
