import { describe, expect, it } from 'vitest';
import { detectAll, type CandidateType, type Handling } from '@privacy-bridge/core';

interface PositiveProbe {
  readonly id: string;
  readonly text: string;
  readonly type: CandidateType;
  readonly surface: string;
  readonly handling?: Handling;
}

const POSITIVE_PROBES: readonly PositiveProbe[] = [
  { id: 'tw-id', text: '身分證：A123456789', type: 'TW_ID', surface: 'A123456789' },
  { id: 'tax-id', text: '統編：04595257', type: 'TW_TAX_ID', surface: '04595257' },
  { id: 'mobile', text: '手機：0912-345-678', type: 'TW_MOBILE', surface: '0912-345-678' },
  { id: 'landline', text: '市話：02-2712-3456', type: 'TW_LANDLINE', surface: '02-2712-3456' },
  {
    id: 'service-phone',
    text: '客服電話：0809-123-456',
    type: 'TW_PHONE_SERVICE',
    surface: '0809-123-456',
  },
  {
    id: 'postcode',
    text: '郵遞區號：110',
    type: 'TW_POSTCODE',
    surface: '110',
  },
  {
    id: 'address',
    text: '地址：臺北市信義區松仁路2之2號5樓',
    type: 'TW_ADDRESS',
    surface: '臺北市信義區松仁路2之2號5樓',
  },
  {
    id: 'known-passport',
    text: '護照：D12345678',
    type: 'TW_PASSPORT',
    surface: 'D12345678',
  },
  {
    id: 'context-passport',
    text: '護照：A12345678',
    type: 'PASSPORT_CANDIDATE',
    surface: 'A12345678',
  },
  {
    id: 'nhi-card',
    text: '健保卡號：123456789012',
    type: 'TW_NHI_CARD',
    surface: '123456789012',
  },
  { id: 'plate', text: '車牌：ABC-1234', type: 'TW_PLATE', surface: 'ABC-1234' },
  {
    id: 'bank-account',
    text: '銀行帳號：1234567890',
    type: 'TW_BANK_ACCOUNT',
    surface: '1234567890',
  },
  {
    id: 'ambiguous-arc-invoice',
    text: '編號：AB12345677',
    type: 'AMBIGUOUS_IDENTIFIER',
    surface: 'AB12345677',
    handling: 'BLOCK_EXPORT',
  },
  {
    id: 'email',
    text: '信箱：demo@example.invalid',
    type: 'EMAIL',
    surface: 'demo@example.invalid',
  },
  { id: 'ipv4', text: '來源 IP：192.0.2.25', type: 'IPV4', surface: '192.0.2.25' },
  {
    id: 'url',
    text: '網址：https://example.invalid/case/42',
    type: 'URL',
    surface: 'https://example.invalid/case/42',
  },
  { id: 'line-id', text: 'LINE ID：@hans.test', type: 'LINE_ID', surface: '@hans.test' },
  {
    id: 'credit-card',
    text: '信用卡：4111 1111 1111 1111',
    type: 'CREDIT_CARD',
    surface: '4111 1111 1111 1111',
    handling: 'BLOCK_EXPORT',
  },
  {
    id: 'secret',
    text: 'password: correct-horse-battery-staple',
    type: 'SECRET',
    surface: 'correct-horse-battery-staple',
    handling: 'BLOCK_EXPORT',
  },
];

const BENIGN_PROBES = [
  '本月共收到 48 件客服案件，比上月多 6 件。',
  '版本 1.3.0，已完成 31 件，仍需追蹤 12 件。',
  '訂單號：123456789',
  '日期：2026-09-01，滿意度 3.6 / 5。',
  '專案代號 AURORA-2026，北區 21 件、中區 14 件、南區 13 件。',
] as const;

describe('Taiwan Traditional Chinese synthetic PII baseline', () => {
  it('detects every versioned positive probe with the expected type and fail-closed handling', () => {
    const missed: string[] = [];
    for (const probe of POSITIVE_PROBES) {
      const detected = detectAll(probe.text);
      if (!detected.ok) {
        missed.push(probe.id);
        continue;
      }
      const match = detected.value.find(
        (candidate) =>
          candidate.primaryType === probe.type && candidate.surfaceText === probe.surface,
      );
      if (!match || (probe.handling && match.handling !== probe.handling)) missed.push(probe.id);
    }
    expect({ total: POSITIVE_PROBES.length, missed }).toEqual({ total: 19, missed: [] });
  });

  it('produces no candidates for the versioned benign business-text probes', () => {
    const falsePositives = BENIGN_PROBES.flatMap((text) => {
      const detected = detectAll(text);
      if (!detected.ok) return ['scan-error'];
      return detected.value.map((candidate) => `${candidate.primaryType}:${candidate.surfaceText}`);
    });
    expect({ total: BENIGN_PROBES.length, falsePositives }).toEqual({
      total: 5,
      falsePositives: [],
    });
  });
});
