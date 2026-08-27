import { describe, expect, it } from 'vitest';
import { defaultSecureStorePath } from '@privacy-bridge/core';

describe('ACC-STR-001 secure-store defaults', () => {
  it('places macOS and Windows stores under OS application data, not a Vault', () => {
    expect(defaultSecureStorePath('darwin', '/Users/fixture')).toBe(
      '/Users/fixture/Library/Application Support/Privacy Bridge',
    );
    expect(defaultSecureStorePath('win32', 'C:\\Users\\fixture')).toContain(
      'AppData/Roaming/Privacy Bridge',
    );
  });
});
