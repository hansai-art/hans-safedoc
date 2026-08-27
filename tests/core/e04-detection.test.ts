import { describe, expect, it } from 'vitest';
import { detectAll } from '@privacy-bridge/core';

describe('E04 detection safety defaults', () => {
  it('captures secret values only and marks them BLOCK_EXPORT', () => {
    const result = detectAll('password: password\nemail: test@example.com.tw');
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.map((candidate) => [candidate.surfaceText, candidate.handling])).toEqual([
      ['password', 'BLOCK_EXPORT'],
      ['test@example.com.tw', 'TOKENIZE'],
    ]);
  });
  it('does not contaminate same-line context across lines and classifies 099 as service', () => {
    const result = detectAll('passport:\nAB1234567\n099-123-4567');
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.some((candidate) => candidate.primaryType === 'TW_PASSPORT')).toBe(false);
    expect(result.value.some((candidate) => candidate.primaryType === 'TW_PHONE_SERVICE')).toBe(
      true,
    );
  });
  it('keeps valid identifiers, value-only labels, and structural context evidence', () => {
    const result = detectAll(
      '身分證：A123456789\nLINE ID: @hans.lin\n110臺北市信義區松仁路2號之2\n護照: A12345678',
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ primaryType: 'TW_ID', surfaceText: 'A123456789' }),
        expect.objectContaining({ primaryType: 'LINE_ID', surfaceText: '@hans.lin' }),
        expect.objectContaining({ primaryType: 'TW_POSTCODE', surfaceText: '110' }),
        expect.objectContaining({
          primaryType: 'TW_ADDRESS',
          surfaceText: '臺北市信義區松仁路2號之2',
        }),
        expect.objectContaining({
          primaryType: 'PASSPORT_CANDIDATE',
          surfaceText: 'A12345678',
          evidence: expect.arrayContaining([
            expect.objectContaining({ source: 'SAME_LABEL_VALUE' }),
          ]),
        }),
      ]),
    );
  });
  it('retains the precise primary type while unioning overlapping block risk', () => {
    const result = detectAll('密碼：A123456789');
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value).toContainEqual(
      expect.objectContaining({
        primaryType: 'TW_ID',
        handling: 'BLOCK_EXPORT',
        matchedRules: expect.arrayContaining(['tw-id-checksum', 'secret-assignment']),
      }),
    );
  });
  it('does not produce broad passport candidates without same-line passport context', () => {
    const result = detectAll('訂單號：123456789');
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.some((candidate) => candidate.primaryType === 'PASSPORT_CANDIDATE')).toBe(
      false,
    );
  });
  it('blocks credential forms without including their label in the value span', () => {
    const result = detectAll(
      'api_key: sk-abcdefghijklmnopqrstuvwxyz123456\npostgres://admin:secret@db.example.com/app\neyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxIn0.c2lnbmF0dXJl',
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const secrets = result.value.filter((candidate) => candidate.primaryType === 'SECRET');
    expect(secrets.map((candidate) => candidate.surfaceText)).toEqual([
      'sk-abcdefghijklmnopqrstuvwxyz123456',
      'secret',
      'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxIn0.c2lnbmF0dXJl',
    ]);
    expect(secrets.every((candidate) => candidate.handling === 'BLOCK_EXPORT')).toBe(true);
    expect(secrets.some((candidate) => candidate.surfaceText.startsWith('api_key'))).toBe(false);
  });
});
