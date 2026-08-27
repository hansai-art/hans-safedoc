import { expect, it } from 'vitest';
import { isValidTwId, isValidTwTaxId } from '@privacy-bridge/core';
it('ACC-DET-018 accepts and rejects locked Taiwan checksum fixtures', () => {
  expect(isValidTwId('A123456789')).toBe(true);
  expect(isValidTwId('A123456788')).toBe(false);
  expect(isValidTwTaxId('04595257')).toBe(true);
  expect(isValidTwTaxId('00000000')).toBe(false);
});
