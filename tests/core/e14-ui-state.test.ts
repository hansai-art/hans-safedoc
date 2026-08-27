import { describe, expect, it } from 'vitest';
import {
  clearSensitiveUiState,
  commandPresentation,
} from '../../packages/obsidian-plugin/src/ui-state.js';

describe('E14 Obsidian accessible UI state', () =>
  it('provides keyboard/screen-reader labels and clears sensitive selection when locked', () => {
    expect(commandPresentation('LOCKED', 'export')).toMatchObject({
      enabled: false,
      ariaLabel: 'Privacy Bridge: export',
    });
    expect(commandPresentation('LOCKED', 'recovery').enabled).toBe(true);
    expect(clearSensitiveUiState()).toEqual({ selectedEntityId: undefined, preview: undefined });
  }));
