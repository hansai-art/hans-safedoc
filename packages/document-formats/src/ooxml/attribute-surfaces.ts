import { createHash } from 'node:crypto';
import type { FormatLocatorV11 } from '../contracts.js';
import type { ZipEntry } from './zip-guard.js';
import { decodeXmlText } from './xml-guard.js';

export type AttributeSurfaceSpec<TKind extends string> = {
  part: string;
  elementQName: string;
  attributeQName: string;
  kind: TKind;
};

export type AttributeSurfaceRecord<TKind extends string> = {
  kind: TKind;
  part: string;
  value: string;
  locator: Extract<FormatLocatorV11, { kind: 'ooxml-attribute-value' }>;
  mandatoryReview: true;
};

function hash(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

function escapedPattern(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&');
}

export function extractAttributeSurfaces<TKind extends string>(
  entries: readonly ZipEntry[],
  packageKind: 'docx' | 'xlsx',
  specs: readonly AttributeSurfaceSpec<TKind>[],
): AttributeSurfaceRecord<TKind>[] {
  const result: AttributeSurfaceRecord<TKind>[] = [];
  for (const spec of specs) {
    const entry = entries.find((candidate) => candidate.name === spec.part);
    if (!entry) continue;
    const xml = entry.data.toString('utf8');
    const elementPattern = new RegExp(`<${escapedPattern(spec.elementQName)}\\b([^>]*)>`, 'gu');
    let occurrence = 0;
    for (const element of xml.matchAll(elementPattern)) {
      const attributePattern = new RegExp(
        `(?:^|\\s)${escapedPattern(spec.attributeQName)}=["']([^"']*)["']`,
        'u',
      );
      const attribute = attributePattern.exec(element[1]!);
      if (!attribute) continue;
      const value = decodeXmlText(attribute[1]!);
      if (!value) continue;
      const canonicalElementPath = `/${spec.elementQName}[${occurrence++}]`;
      result.push({
        kind: spec.kind,
        part: spec.part,
        value,
        mandatoryReview: true,
        locator: {
          kind: 'ooxml-attribute-value',
          package: packageKind,
          partName: spec.part,
          canonicalElementPath,
          elementQName: spec.elementQName,
          attributeQName: spec.attributeQName,
          startUtf16: 0,
          endUtf16: value.length,
          sourceSurfaceHashSha256: hash(
            `${spec.part}\u0000${canonicalElementPath}\u0000${spec.attributeQName}\u0000${value}`,
          ),
          mapSha256: hash(`${spec.part}\u0000${element.index}\u0000${spec.attributeQName}`),
        },
      });
    }
  }
  return result;
}
