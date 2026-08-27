import { expect, it } from 'vitest';
import { CORE_PACKAGE_ID, canonicalStringify } from '@privacy-bridge/core';

it('ACC-OPS-006: release artifact identity uses deterministic canonical source metadata', () => {
  expect(CORE_PACKAGE_ID).toBe('privacy-bridge-core');
  expect(canonicalStringify({ sourceCommit: 'abc', checksums: { bundle: 'def' } })).toBe(
    '{"checksums":{"bundle":"def"},"sourceCommit":"abc"}',
  );
});
