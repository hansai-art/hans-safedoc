import { randomBytes } from 'node:crypto';
import { expect, it } from 'vitest';
import { createEntityId, tokenFor, verifyToken } from '@privacy-bridge/core';
it('ACC-TOK-007 rejects modified ID, tag, and type without an existence oracle', () => {
  const key = randomBytes(32),
    token = tokenFor(key, 'job', 'PERSON', createEntityId());
  const [, type, entityId, tag] = token.match(
    /^⟦PB:([A-Z][A-Z0-9_]{1,31}):([0-9A-HJKMNP-TV-Z]{16}):([0-9A-HJKMNP-TV-Z]{20})⟧$/u,
  )!;
  const changeFirstCharacter = (value: string) =>
    `${value[0] === '0' ? '1' : '0'}${value.slice(1)}`;
  const forgeries = [
    `⟦PB:SYSTEM:${entityId}:${tag}⟧`,
    `⟦PB:${type}:${entityId}:${changeFirstCharacter(tag!)}⟧`,
    `⟦PB:${type}:${changeFirstCharacter(entityId!)}:${tag}⟧`,
  ];
  expect(forgeries.every((value) => value !== token)).toBe(true);
  expect(forgeries.every((value) => !verifyToken(value, key, 'job').ok)).toBe(true);
});
