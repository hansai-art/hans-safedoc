import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';
import { OOXML_CONTRACTS_SOURCE_SHA256 } from '../packages/document-formats/src/ooxml/generated-contracts.js';

const sources = [
  '../docs/HANS-SAFEDOC-V1.1-OOXML-ALLOWLIST.csv',
  '../docs/HANS-SAFEDOC-V1.1-OOXML-RELATIONSHIPS.csv',
  '../docs/HANS-SAFEDOC-V1.1-OOXML-SURFACES.csv',
] as const;

describe('bundled OOXML contract snapshot', () => {
  it('exactly matches the normative CSV source hash', async () => {
    const contents = await Promise.all(
      sources.map((source) => readFile(new URL(source, import.meta.url), 'utf8')),
    );
    const sha256 = createHash('sha256').update(contents.join('\u0000'), 'utf8').digest('hex');
    expect(OOXML_CONTRACTS_SOURCE_SHA256).toBe(sha256);
  });
});
