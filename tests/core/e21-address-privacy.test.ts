import { describe, expect, it } from 'vitest';
import { mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { restoreText, splitTaiwanAddressForPrivacy } from '@privacy-bridge/core';
import { createAnalysisBundle } from '../../packages/obsidian-plugin/src/analysis-request.js';
import {
  prepareReviewedDocument,
  scanSyntheticDocument,
} from '../../packages/obsidian-plugin/src/workflow.js';

const acceptAll = (source: string, mode: 'FULL_REDACTION' | 'KEEP_CITY' | 'KEEP_DISTRICT') => {
  const scanned = scanSyntheticDocument(source);
  if (!scanned.ok) throw new Error(scanned.error.code);
  const prepared = prepareReviewedDocument(
    source,
    scanned.value,
    Object.fromEntries(scanned.value.map((candidate) => [candidate.candidateId, 'ACCEPTED'])),
    { addressPrivacyMode: mode },
  );
  if (!prepared.ok) throw new Error(prepared.error.code);
  return prepared.value;
};

describe('Hans SafeDoc 1.4 address privacy modes', () => {
  it('splits admitted Taiwan addresses without normalizing the visible source spelling', () => {
    expect(
      splitTaiwanAddressForPrivacy('台北市大安區基隆路二段172之1號8樓', 'KEEP_CITY'),
    ).toMatchObject({
      publicPrefix: '台北市',
      protectedDetail: '大安區基隆路二段172之1號8樓',
      fellBackToFullRedaction: false,
    });
    expect(
      splitTaiwanAddressForPrivacy('臺北市大安區基隆路二段172之1號8樓', 'KEEP_DISTRICT'),
    ).toMatchObject({
      publicPrefix: '臺北市大安區',
      protectedDetail: '基隆路二段172之1號8樓',
      fellBackToFullRedaction: false,
    });
    expect(splitTaiwanAddressForPrivacy('新北市板橋區區運路10號', 'KEEP_DISTRICT')).toMatchObject({
      publicPrefix: '新北市板橋區',
      protectedDetail: '區運路10號',
    });
  });

  it('keeps only the selected public prefix and restores the private suffix through mapping', () => {
    const city = acceptAll('地址：臺北市大安區基隆路二段172之1號8樓', 'KEEP_CITY');
    expect(city.sanitizedContent).toContain(`臺北市${city.mapping[0]!.token}`);
    expect(city.sanitizedContent).not.toContain('大安區');
    expect(city.mapping[0]!.preferredDisplay).toBe('大安區基隆路二段172之1號8樓');

    const district = acceptAll('地址：臺北市大安區基隆路二段172之1號8樓', 'KEEP_DISTRICT');
    expect(district.sanitizedContent).toContain(`臺北市大安區${district.mapping[0]!.token}`);
    expect(district.sanitizedContent).not.toContain('基隆路');
    expect(district.mapping[0]!.preferredDisplay).toBe('基隆路二段172之1號8樓');
    const restored = restoreText(district.sanitizedContent, district.mapping);
    expect(restored.ok && restored.value).toBe('地址：臺北市大安區基隆路二段172之1號8樓');
  });

  it('fails closed to full-address protection when the requested district is unavailable', () => {
    const split = splitTaiwanAddressForPrivacy('臺北市松仁路2號', 'KEEP_DISTRICT');
    expect(split).toEqual({
      mode: 'FULL_REDACTION',
      publicPrefix: '',
      protectedDetail: '臺北市松仁路2號',
      fellBackToFullRedaction: true,
    });
  });

  it('records the selected address privacy policy without putting raw mapping in the bundle', async () => {
    const root = await mkdtemp(join(tmpdir(), 'hans-safedoc-address-policy-'));
    const prepared = acceptAll('地址：臺北市大安區基隆路二段172之1號8樓', 'KEEP_DISTRICT');
    const outputFile = join(root, 'safe.md');
    await writeFile(outputFile, prepared.sanitizedContent, 'utf8');
    const bundle = await createAnalysisBundle({
      outputFile,
      prepared,
      createdAt: '2026-09-02T00:00:00.000Z',
    });
    const packageText = new TextDecoder().decode(await readFile(bundle.safePackageFile));
    expect(packageText).toContain('"addressMode":"KEEP_DISTRICT"');
    expect(packageText).not.toContain('基隆路二段172之1號8樓');
    const request = JSON.parse(await readFile(bundle.analysisRequestFile, 'utf8')) as {
      privacyPolicy: { addressMode: string };
    };
    expect(request.privacyPolicy.addressMode).toBe('KEEP_DISTRICT');
  });
});
