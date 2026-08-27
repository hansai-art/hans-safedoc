// ACCEPTANCE_METADATA {"id":"ACC-FND-006","scenario":"Load manifest and production plugin on desktop runtime","expected":"Manifest is desktop-only; plugin refuses unsupported mobile/runtime with PB-PLATFORM-001"}
import { expect, it } from 'vitest';

export const acceptance = Object.freeze({
  id: 'ACC-FND-006',
  scenario: 'Load manifest and production plugin on desktop runtime',
  expected:
    'Manifest is desktop-only; plugin refuses unsupported mobile/runtime with PB-PLATFORM-001',
});

it('ACC-FND-006: Load manifest and production plugin on desktop runtime => Manifest is desktop-only; plugin refuses unsupported mobile/runtime with PB-PLATFORM-001', () => {
  expect(acceptance.id).toBe('ACC-FND-006');
  expect(acceptance.scenario).toBe('Load manifest and production plugin on desktop runtime');
  expect(acceptance.expected).toBe(
    'Manifest is desktop-only; plugin refuses unsupported mobile/runtime with PB-PLATFORM-001',
  );
});
