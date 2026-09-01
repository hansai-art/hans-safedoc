import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  prepareReviewedDocument,
  scanSyntheticDocument,
} from '../../packages/obsidian-plugin/src/workflow.js';
import {
  ALPHA_BUILT_IN_TYPES,
  DICTIONARY_ONLY_TYPES,
  MODEL_POLICY,
  NOVICE_DEMO_MARKDOWN,
  NOVICE_DEMO_PATH,
  SUPPORT_LIMITATIONS,
  UNSUPPORTED_FILE_TYPES,
  normalizeNoviceSettings,
} from '../../packages/obsidian-plugin/src/novice-support.js';

describe('novice pre-install product contract', () => {
  it('lists current deterministic coverage separately from dictionary-only and unsupported input', () => {
    expect(ALPHA_BUILT_IN_TYPES).toContain('TW_MOBILE');
    expect(ALPHA_BUILT_IN_TYPES).toContain('EMAIL');
    expect(ALPHA_BUILT_IN_TYPES).toContain('SECRET');
    expect(ALPHA_BUILT_IN_TYPES).not.toContain('PERSON');
    expect(DICTIONARY_ONLY_TYPES).toEqual([
      'PERSON',
      'ORGANIZATION',
      'PROJECT',
      'PRODUCT',
      'DEPARTMENT',
      'SYSTEM',
      'CUSTOM_TERM',
    ]);
    expect(UNSUPPORTED_FILE_TYPES.join('、')).toContain('PDF（.pdf）');
    expect(UNSUPPORTED_FILE_TYPES.join('、')).toContain('舊版 Word（.doc）');
    expect(UNSUPPORTED_FILE_TYPES.join('、')).toContain('圖片、音訊、影片');
    expect(UNSUPPORTED_FILE_TYPES).toEqual(
      expect.arrayContaining(['Obsidian 畫布（Canvas）', 'Obsidian 資料庫檢視（Bases）']),
    );
    expect(MODEL_POLICY.required).toBe(false);
    expect(MODEL_POLICY.userSelectable).toBe(false);
    expect(MODEL_POLICY.offlineInstallSupported).toBe(false);
    expect(MODEL_POLICY.distributionEnabled).toBe(false);
    expect(MODEL_POLICY.summary).toContain('正式版不提供模型安裝');
    expect(SUPPORT_LIMITATIONS.join('')).toContain('停止輸出');
    expect(SUPPORT_LIMITATIONS.join('')).toContain('文字前後關係');
  });

  it('ships an opt-in synthetic practice note that exercises the real detector safely', () => {
    expect(NOVICE_DEMO_PATH).toBe('Hans SafeDoc 安全練習/開始練習.md');
    expect(NOVICE_DEMO_MARKDOWN).toContain('.invalid');
    expect(NOVICE_DEMO_MARKDOWN).toContain('全部是合成測試資料');
    expect(NOVICE_DEMO_MARKDOWN).toContain('本月共收到 48 件客服案件');
    expect(NOVICE_DEMO_MARKDOWN).toContain('平均第一次回覆時間：7.2 小時');
    expect(NOVICE_DEMO_MARKDOWN).toContain('請協助分析');
    expect(NOVICE_DEMO_MARKDOWN).toContain('---');
    expect(NOVICE_DEMO_MARKDOWN).toContain('> 客戶原話');
    expect(NOVICE_DEMO_MARKDOWN).toContain('- [ ]');
    const scanned = scanSyntheticDocument(NOVICE_DEMO_MARKDOWN);
    expect(scanned.ok).toBe(true);
    if (!scanned.ok) return;
    expect(scanned.value).toHaveLength(20);
    expect(scanned.value.filter((candidate) => candidate.primaryType === 'TW_MOBILE')).toHaveLength(
      10,
    );
    expect(scanned.value.filter((candidate) => candidate.primaryType === 'EMAIL')).toHaveLength(10);
    expect(scanned.value.some((candidate) => candidate.handling === 'BLOCK_EXPORT')).toBe(false);
    const outsideTables = scanned.value.filter((candidate) => {
      const lineStart = NOVICE_DEMO_MARKDOWN.lastIndexOf('\n', candidate.start) + 1;
      const nextBreak = NOVICE_DEMO_MARKDOWN.indexOf('\n', candidate.end);
      const lineEnd = nextBreak === -1 ? NOVICE_DEMO_MARKDOWN.length : nextBreak;
      return !NOVICE_DEMO_MARKDOWN.slice(lineStart, lineEnd).includes('|');
    });
    expect(outsideTables.length).toBeGreaterThanOrEqual(12);

    const decisions = Object.fromEntries(
      scanned.value.map((candidate) => [candidate.candidateId, 'ACCEPTED' as const]),
    );
    const prepared = prepareReviewedDocument(NOVICE_DEMO_MARKDOWN, scanned.value, decisions);
    expect(prepared.ok).toBe(true);
    if (!prepared.ok) return;
    expect(prepared.value.sanitizedContent).not.toContain('0912-345-671');
    expect(prepared.value.sanitizedContent).not.toContain('practice01@example.invalid');
    for (const analysisFact of [
      '本月共收到 48 件客服案件',
      '產品操作 18 件',
      '帳務付款 11 件',
      '平均第一次回覆時間：7.2 小時',
      '整體滿意度：3.6 / 5',
    ])
      expect(prepared.value.sanitizedContent).toContain(analysisFact);
  });

  it('persists only consent/version and non-sensitive onboarding completion flags', () => {
    expect(normalizeNoviceSettings(undefined)).toEqual({
      securityNoticeAccepted: false,
      securityNoticeVersion: undefined,
      onboardingCompleted: false,
      localModelEnabled: false,
    });
    expect(
      normalizeNoviceSettings({
        securityNoticeAccepted: true,
        securityNoticeVersion: '1.3.0',
        onboardingCompleted: true,
        sourceText: 'must not survive',
      }),
    ).toEqual({
      securityNoticeAccepted: true,
      securityNoticeVersion: '1.3.0',
      onboardingCompleted: true,
      localModelEnabled: false,
    });
  });
});

describe('novice installed guidance contract', () => {
  it('provides a first-run security gate, guided practice, and pre-install disclosure', () => {
    const modal = readFileSync(
      resolve(import.meta.dirname, '../../packages/obsidian-plugin/src/first-run-modal.ts'),
      'utf8',
    );
    const styles = readFileSync(
      resolve(import.meta.dirname, '../../packages/obsidian-plugin/styles.css'),
      'utf8',
    );
    expect(modal).toContain('我理解以上限制');
    expect(modal).toContain('正式版不提供模型安裝');
    expect(styles).toContain('max-height: min(640px, calc(100vh - 160px))');
    expect(styles).toContain('overflow-y: auto');
    expect(modal).not.toContain('線上安裝小型模型');
    expect(modal).not.toContain('匯入離線模型包');
    expect(modal).not.toContain('GPL-3.0');
    expect(modal).toContain('建立安全練習筆記');
    expect(modal).toContain('目前 Hans SafeDoc v1.3 可用');
    expect(modal).toContain("attr: { tabindex: '-1' }");
    expect(modal).toContain('queueMicrotask(() => title.focus())');
    expect(modal).toContain('正在儲存固定規則設定');
    expect(modal).not.toContain('innerHTML');

    const main = readFileSync(
      resolve(import.meta.dirname, '../../packages/obsidian-plugin/src/main.ts'),
      'utf8',
    );
    expect(main).toContain('loadData');
    expect(main).toContain('saveData');
    expect(main).toContain('openFirstRunGuide');
    expect(main).toContain('createNoviceDemo');
    expect(main).toContain('!this.noviceSettings.securityNoticeAccepted');
    expect(main).toContain('ensureSecurityNoticeAccepted()');
    expect(main).toContain('if (!this.ensureSecurityNoticeAccepted()) return false');
    expect(main).toContain('首次設定尚未完成');
    expect(main).toContain("id: 'open-getting-started'");
    expect(main).not.toContain('installPinnedModelDownload');
    expect(main).not.toContain('installOfflineModelPackage');
    expect(main).not.toContain('LocalModelRuntime');

    const readme = readFileSync(resolve(import.meta.dirname, '../../README.md'), 'utf8');
    expect(readme.indexOf('安裝前先看')).toBeLessThan(readme.indexOf('安裝步驟'));
    expect(readme).toContain('Ollama（離線模型執行工具）');
    expect(readme).toContain('LLM（大型語言模型）');
    expect(readme).toContain('v1.3 支援下列唯讀來源');
    expect(readme).toContain('公式、註解、外部資料');
    expect(readme).toContain('未列格式都會阻擋');

    const help = readFileSync(
      resolve(import.meta.dirname, '../../packages/obsidian-plugin/src/help-view.ts'),
      'utf8',
    );
    expect(help).toContain('按「還原 AI 結果」');
    expect(help).toContain('符合 result-package.schema.json');
    const noviceCopy = `${modal}\n${help}\n${readme}`;
    for (const unexplainedTerm of [
      'occurrence context',
      'Residual Scan',
      'Client Dictionary UI',
      'deterministic recognizers',
    ])
      expect(noviceCopy).not.toContain(unexplainedTerm);
    expect(noviceCopy).toContain('安全分析包（Safe Package）');
    expect(noviceCopy).toContain('Obsidian 畫布（Canvas）');
    expect(noviceCopy).toContain('Obsidian 資料庫檢視（Bases）');
    expect(noviceCopy).toContain('客戶字典');
  });
});
