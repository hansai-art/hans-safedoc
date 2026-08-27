import { expect, it } from 'vitest';
import { isValidTwLandline } from '@privacy-bridge/core';
it('ACC-DET-012 rejects mobile-like prefixes as landlines', () => {
  expect(['0900-123-456', '0910-123-456', '0911-123-456'].every((v) => !isValidTwLandline(v))).toBe(
    true,
  );
});
