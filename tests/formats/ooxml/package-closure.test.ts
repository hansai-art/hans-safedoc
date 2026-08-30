import { readFile } from 'node:fs/promises';
import { randomBytes } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import {
  assertOoxmlGraphConservation,
  matchesOoxmlContractPattern,
  preflightOoxml,
  preflightOoxmlSnapshot,
} from '../../../packages/document-formats/src/ooxml/preflight.js';
import { OOXML_CONTRACTS } from '../../../packages/document-formats/src/ooxml/contracts.js';
import {
  OoxmlBlockedError,
  replaceZipEntries,
} from '../../../packages/document-formats/src/ooxml/zip-guard.js';

const corpus = new URL('../../fixtures/document-formats/', import.meta.url);

async function mutation(
  name: 'common-libreoffice.docx' | 'common-libreoffice.xlsx',
  part: string,
  change: (xml: string) => string,
): Promise<Buffer> {
  const source = await readFile(new URL(name, corpus));
  const { readZip } = await import('../../../packages/document-formats/src/ooxml/zip-guard.js');
  const entry = readZip(source).find((candidate) => candidate.name === part);
  if (!entry) throw new Error(`Synthetic fixture is missing ${part}`);
  return replaceZipEntries(
    source,
    new Map([[part, Buffer.from(change(entry.data.toString('utf8')))]]),
  );
}

function expectBlocked(source: Buffer, kind: 'docx' | 'xlsx', blocker: string) {
  expect(() => preflightOoxml(source, kind)).toThrow(OoxmlBlockedError);
  try {
    preflightOoxml(source, kind);
  } catch (error) {
    expect((error as OoxmlBlockedError).blockers.some((value) => value.startsWith(blocker))).toBe(
      true,
    );
  }
}

describe('OOXML package closure contract', () => {
  it('loads the normative machine contracts', () => {
    expect(
      OOXML_CONTRACTS.surfaces.some(
        (rule) =>
          rule.part_pattern === 'word/document.xml' && rule.element_local_name === 'document',
      ),
    ).toBe(true);
    expect(matchesOoxmlContractPattern('word/document.xml', 'word/document.xml')).toBe(true);
    expect(
      matchesOoxmlContractPattern(
        'word/document.xml',
        'word/{document|headerN|footerN|footnotes|endnotes|comments}.xml',
      ),
    ).toBe(true);
  });
  it('admits the normal synthetic LibreOffice DOCX/XLSX corpus', async () => {
    const docx = await readFile(new URL('common-libreoffice.docx', corpus));
    const xlsx = await readFile(new URL('common-libreoffice.xlsx', corpus));
    expect(() => preflightOoxml(docx, 'docx')).not.toThrow();
    expect(() => preflightOoxml(xlsx, 'xlsx')).not.toThrow();
  });

  it('returns a hash-bound graph snapshot and exposes graph conservation for rewrites', async () => {
    const source = await readFile(new URL('common-libreoffice.docx', corpus));
    const snapshot = preflightOoxmlSnapshot(source, 'docx');
    expect(snapshot.parts.some((part) => part.name === 'word/document.xml')).toBe(true);
    expect(
      snapshot.relationships.some((relationship) => relationship.target === 'word/document.xml'),
    ).toBe(true);
    expect(snapshot.contentTypesSha256).toMatch(/^[a-f0-9]{64}$/u);
    expect(() => assertOoxmlGraphConservation(source, source, 'docx')).not.toThrow();
  });

  it.each([
    [
      'duplicate',
      (xml: string) =>
        xml.replace(
          '</Types>',
          '<Override PartName="/word/document.xml" ContentType="application/x-forged"/></Types>',
        ),
      'content-type-duplicate:word/document.xml',
    ],
    [
      'missing',
      (xml: string) => xml.replace(/<Override PartName="\/word\/document\.xml"[^>]*\/>/u, ''),
      'content-type-missing:word/document.xml',
    ],
    [
      'unknown',
      (xml: string) =>
        xml.replace(
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml',
          'application/x-forged',
        ),
      'content-type-unknown:word/document.xml',
    ],
  ])('rejects %s Content Types mappings', async (_caseName, change, blocker) => {
    expectBlocked(
      await mutation('common-libreoffice.docx', '[Content_Types].xml', change),
      'docx',
      blocker,
    );
  });

  it.each([
    [
      'non-canonical full Type URI',
      (xml: string) =>
        xml.replace(
          'http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument',
          'https://forged.invalid/officeDocument',
        ),
      'relationship-contract:_rels/.rels:',
    ],
    [
      'wrong source to target',
      (xml: string) => xml.replace('Target="word/document.xml"', 'Target="docProps/core.xml"'),
      'relationship-contract:_rels/.rels:',
    ],
    [
      'wrong TargetMode',
      (xml: string) =>
        xml.replace(
          'Target="word/document.xml"',
          'Target="word/document.xml" TargetMode="External"',
        ),
      'relationship-contract:_rels/.rels:',
    ],
    [
      'OPC escape',
      (xml: string) => xml.replace('Target="word/document.xml"', 'Target="../../../escape.xml"'),
      'relationship-target-invalid:_rels/.rels:',
    ],
    [
      'encoded OPC escape',
      (xml: string) =>
        xml.replace('Target="word/document.xml"', 'Target="%2e%2e/%2e%2e/escape.xml"'),
      'relationship-target-invalid:_rels/.rels:',
    ],
    [
      'duplicate Id',
      (xml: string) => xml.replace('Id="rId2"', 'Id="rId1"'),
      'relationship-duplicate-id:_rels/.rels:rId1',
    ],
    [
      'dangling target',
      (xml: string) => xml.replace('Target="word/document.xml"', 'Target="word/missing.xml"'),
      'relationship-dangling:_rels/.rels:',
    ],
  ])('rejects %s', async (_caseName, change, blocker) => {
    expectBlocked(
      await mutation('common-libreoffice.docx', '_rels/.rels', change),
      'docx',
      blocker,
    );
  });

  it.each([
    [
      'namespace',
      (xml: string) =>
        xml.replace(
          'xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"',
          'xmlns:w="urn:synthetic:unknown"',
        ),
      'surface-namespace:word/document.xml',
    ],
    [
      'QName',
      (xml: string) => xml.replace('<w:body>', '<w:unknown/> <w:body>'),
      'surface-qname:word/document.xml:{http://schemas.openxmlformats.org/wordprocessingml/2006/main}unknown',
    ],
    [
      'attribute',
      (xml: string) => xml.replace('<w:body>', '<w:body synthetic="1">'),
      'surface-attribute:word/document.xml:synthetic',
    ],
  ])('rejects unknown surface %s', async (_caseName, change, blocker) => {
    expectBlocked(
      await mutation('common-libreoffice.docx', 'word/document.xml', change),
      'docx',
      blocker,
    );
  });

  it('rejects an XML attribute whose namespace prefix was never declared', async () => {
    const malformed = await mutation('common-libreoffice.docx', 'word/theme/theme1.xml', (xml) =>
      xml.replace('<a:srgbClr ', '<a:srgbClr synthetic:val="forged" '),
    );

    expectBlocked(malformed, 'docx', 'xml-unbound-prefix:word/theme/theme1.xml:synthetic');
  });

  it('rejects a closing tag whose namespace prefix was never declared', async () => {
    const malformed = await mutation('common-libreoffice.docx', 'word/theme/theme1.xml', (xml) =>
      xml.replace('</a:theme>', '</synthetic:theme>'),
    );

    expectBlocked(malformed, 'docx', 'xml-unbound-prefix:word/theme/theme1.xml:synthetic');
  });

  it('enforces XML text and depth ceilings before adapter extraction', async () => {
    const oversized = await mutation('common-libreoffice.docx', 'word/document.xml', (xml) =>
      xml.replace('Hans SafeDoc Office ', randomBytes(786_433).toString('base64')),
    );
    expectBlocked(oversized, 'docx', 'xml-text-limit:word/document.xml');

    const deeplyNested = await mutation('common-libreoffice.docx', 'word/document.xml', (xml) =>
      xml
        .replace('<w:body>', `${'<w:p>'.repeat(65)}<w:body>`)
        .replace('</w:body>', `</w:body>${'</w:p>'.repeat(65)}`),
    );
    expectBlocked(deeplyNested, 'docx', 'xml-depth-limit:word/document.xml');
  });
});
