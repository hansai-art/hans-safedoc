import { expect, it } from 'vitest';
import { restoreText, transitionJob } from '@privacy-bridge/core';

it('ACC-IMP-007: restores repeated known tokens while preserving original Shadow token text', () => {
  const token = '⟦PB:PERSON:0123456789ABCDEF:0123456789ABCDEFGHJKM⟧';
  const shadow = `A ${token}, B ${token}`;
  expect(restoreText(shadow, [{ token, preferredDisplay: 'Alice' }])).toEqual({
    ok: true,
    value: 'A Alice, B Alice',
  });
  expect(shadow).toContain(token);
  expect(transitionJob('RESULT_IMPORTED', 'READY_TO_RESTORE')).toEqual({
    ok: true,
    value: 'READY_TO_RESTORE',
  });
});
