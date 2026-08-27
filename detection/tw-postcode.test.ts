import { expect, it } from 'vitest';
import { detectAll } from '@privacy-bridge/core';
it('ACC-DET-016 detects postcode before city and labelled short postcodes', () => {
  const result = detectAll('106409臺北市大安區\n郵遞區號：110');
  expect(
    result.ok &&
      result.value.filter((c) => c.primaryType === 'TW_POSTCODE').map((c) => c.surfaceText),
  ).toEqual(['106409', '110']);
});
