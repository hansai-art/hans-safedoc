import { describe, expect, it } from 'vitest';
import {
  prepareReviewedDocument,
  scanSyntheticDocument,
} from '../../packages/obsidian-plugin/src/workflow.js';

const enabled = process.env.PRIVACY_BRIDGE_LARGE_SMOKE === '1' ? describe : describe.skip;
const TARGET_BYTES = 50 * 1024 * 1024;

function syntheticDocument(): string {
  const rows = ['# Privacy Bridge 50MB synthetic benchmark'];
  for (let index = 0; index < 1_000; index += 1) {
    const digits = String(345_000 + index);
    rows.push(
      `測試資料 ${String(index + 1).padStart(4, '0')}：0912-${digits.slice(0, 3)}-${digits.slice(3)}；bulk${String(index + 1).padStart(4, '0')}@example.invalid`,
    );
  }
  const prefix = `${rows.join('\n')}\n`;
  return `${prefix}${'x'.repeat(TARGET_BYTES - Buffer.byteLength(prefix, 'utf8'))}`;
}

enabled('50MB / 1,000-record large document smoke', () => {
  it('detects 2,000 candidates and prepares 1,000 bounded hunks', () => {
    const source = syntheticDocument();
    expect(Buffer.byteLength(source, 'utf8')).toBe(TARGET_BYTES);
    const scanStarted = performance.now();
    const scanned = scanSyntheticDocument(source);
    const scanMs = performance.now() - scanStarted;
    expect(scanned.ok).toBe(true);
    if (!scanned.ok) return;
    expect(scanned.value).toHaveLength(2_000);

    const decisions = Object.fromEntries(
      scanned.value.map((candidate) => [candidate.candidateId, 'ACCEPTED' as const]),
    );
    const prepareStarted = performance.now();
    const prepared = prepareReviewedDocument(source, scanned.value, decisions);
    const prepareMs = performance.now() - prepareStarted;
    expect(prepared.ok).toBe(true);
    if (!prepared.ok) return;
    expect(prepared.value.previewHunks).toHaveLength(1_000);
    expect(prepared.value.previewHunks[0]?.displayAfterLine).toContain('⟦手機代碼 01⟧');
    expect(prepared.value.previewHunks[999]?.displayAfterLine).toContain('⟦電子郵件代碼 1000⟧');
    expect(scanMs).toBeLessThan(60_000);
    expect(prepareMs).toBeLessThan(60_000);
    console.log(
      JSON.stringify({ bytes: TARGET_BYTES, candidates: 2_000, hunks: 1_000, scanMs, prepareMs }),
    );
  }, 120_000);
});
