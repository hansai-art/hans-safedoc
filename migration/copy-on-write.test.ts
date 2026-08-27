import { expect, it } from 'vitest';
import { copyOnWriteMigrate } from '@privacy-bridge/core';

it('ACC-OPS-004: failed migration retains readable old data and successful migration keeps recovery snapshot', () => {
  const old = new Map([['job.enc', new Uint8Array([1])]]);
  expect(
    copyOnWriteMigrate(old, () => {
      throw new Error('fail before swap');
    }).ok,
  ).toBe(false);
  expect(old.get('job.enc')).toEqual(new Uint8Array([1]));
  const migrated = copyOnWriteMigrate(old, (staging) =>
    staging.set('job.enc', new Uint8Array([2])),
  );
  expect(migrated.ok && migrated.value.recoverySnapshot.get('job.enc')).toEqual(
    new Uint8Array([1]),
  );
});
