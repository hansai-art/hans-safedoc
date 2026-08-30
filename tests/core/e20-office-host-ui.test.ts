import { readFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';
import {
  explainExternalFileError,
  openExternalReviewDocument,
} from '../../packages/obsidian-plugin/src/external-format-workflow.js';

const fixtures = new URL('../fixtures/document-formats/', import.meta.url);

describe('Office Host release UI', () => {
  it('carries DOCX part and XLSX sheet/cell locations into the review document', async () => {
    const docx = await openExternalReviewDocument(new URL('messy-minimal.docx', fixtures).pathname);
    const xlsx = await openExternalReviewDocument(
      new URL('messy-formula-free.xlsx', fixtures).pathname,
    );
    expect(docx.status).toBe('READY');
    expect(xlsx.status).toBe('READY');
    if (docx.status !== 'READY' || xlsx.status !== 'READY') return;
    expect([...docx.document.candidateLocations.values()]).toEqual(
      expect.arrayContaining([expect.stringMatching(/^word\//u)]),
    );
    expect([...xlsx.document.candidateLocations.values()]).toEqual(
      expect.arrayContaining([
        expect.stringMatching(/工作表.+儲存格/u),
        expect.stringMatching(/（hidden|veryHidden）/u),
      ]),
    );
  });

  it('does not echo an unexpected full path into the user-facing blocker', () => {
    const privatePath = '/Users/example/Private/customer-list.xlsx';
    const message = explainExternalFileError(new Error(`${privatePath}: internal failure`));
    expect(message).not.toContain(privatePath);
    expect(message).toContain('來源未修改，也沒有建立輸出');
  });

  it('ships fidelity, native-open, Finder and accessible target affordances', async () => {
    const workspace = await readFile(
      new URL('../../packages/obsidian-plugin/src/workspace.ts', import.meta.url),
      'utf8',
    );
    const styles = await readFile(
      new URL('../../packages/obsidian-plugin/styles.css', import.meta.url),
      'utf8',
    );
    expect(workspace).toContain('這裡只預覽文字安全代碼化結果，不模擬 Word／Excel 版面');
    expect(workspace).toContain('用預設程式開啟安全檔案');
    expect(workspace).toContain('顯示輸出位置');
    expect(workspace).toContain('來源檔案：${displaySourceName(this.sourcePath)}');
    expect(workspace).not.toContain('來源：${this.sourcePath}');
    expect(styles).toMatch(/\.privacy-bridge-output-actions button\s*\{[^}]*min-height:\s*44px;/u);
  });
});
