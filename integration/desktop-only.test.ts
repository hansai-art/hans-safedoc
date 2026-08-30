import { describe, expect, it } from 'vitest';
import { assertDesktopRuntime } from '@privacy-bridge/obsidian-plugin';

describe('ACC-FND-006 desktop runtime', () => {
  it('accepts desktop and rejects mobile with the platform error', () => {
    expect(() => assertDesktopRuntime({ isMobile: false })).not.toThrow();
    expect(() => assertDesktopRuntime({ isMobile: true })).toThrow(
      'PB-PLATFORM-001: Hans SafeDoc requires Obsidian Desktop.',
    );
  });
});
