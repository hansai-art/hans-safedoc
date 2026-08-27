import { expect, it } from 'vitest';
import { detectAll } from '@privacy-bridge/core';
it('ACC-DET-011 classifies Taiwan mobile, service, and landline fixtures', () => {
  const result = detectAll('0900-123-456 0987-123-456 099-123-4567 0809-123-456 02-2712-3456');
  expect(result.ok && result.value.map((c) => c.primaryType)).toEqual([
    'TW_MOBILE',
    'TW_MOBILE',
    'TW_PHONE_SERVICE',
    'TW_PHONE_SERVICE',
    'TW_LANDLINE',
  ]);
});
