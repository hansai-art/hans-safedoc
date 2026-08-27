import { describe, expect, it } from 'vitest';
import { detectAll, isValidTwId, isValidTwTaxId } from '@privacy-bridge/core';

describe('ACC-FND-008 legacy compatibility', () => {
  it('runs the legacy Taiwan regression scenarios through the product recognizer', () => {
    expect(isValidTwId('A123456789')).toBe(true);
    expect(isValidTwTaxId('22099131')).toBe(true);
    expect(detectAll('統編 22099131').ok).toBe(true);
  });
});
