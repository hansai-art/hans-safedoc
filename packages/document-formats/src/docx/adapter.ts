import { createHash } from 'node:crypto';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { FormatLocatorV11, RewriteOperation } from '../contracts.js';
import {
  assertOoxmlGraphConservation,
  preflightOoxml,
  preflightOoxmlSnapshot,
} from '../ooxml/preflight.js';
import { extractAttributeSurfaces } from '../ooxml/attribute-surfaces.js';
import { verifyOoxmlReopen } from '../ooxml/reopen-verifier.js';
import {
  OoxmlBlockedError,
  readZip,
  replaceZipEntries,
  type ZipEntry,
} from '../ooxml/zip-guard.js';
import { decodeXmlText, escapeXmlText, xmlElements } from '../ooxml/xml-guard.js';

type DocxTextLocator = Extract<FormatLocatorV11, { kind: 'docx-text' }>;
type DocxTextOperation = RewriteOperation<DocxTextLocator>;

export interface DocxSurface {
  part: string;
  paragraph: number;
  text: string;
  locator: DocxTextLocator;
}

export interface DocxReviewItem {
  kind:
    | 'comment-author'
    | 'metadata'
    | 'hyperlink'
    | 'drawingml-text'
    | 'style-name'
    | 'font-name'
    | 'theme-name';
  part: string;
  value: string;
  locator: FormatLocatorV11;
  mandatoryReview: true;
}

export interface DocxMediaInventory {
  part: string;
  sha256: string;
  mime: 'image/png' | 'image/jpeg';
  dimensions: { width: number; height: number } | null;
  relationships: readonly { relsPart: string; relationshipId: string; sourcePart: string }[];
  location: readonly string[];
  mandatoryReview: true;
  decision: 'pending';
}

export interface DocxExtraction {
  surfaces: DocxSurface[];
  reviewItems: DocxReviewItem[];
  hyperlinks: { target: string; locator: FormatLocatorV11; mandatoryReview: true }[];
  media: DocxMediaInventory[];
  manualReview: string[];
  entryCount: number;
}

const DOCX_ATTRIBUTE_SURFACES = [
  { part: 'word/styles.xml', elementQName: 'w:name', attributeQName: 'w:val', kind: 'style-name' },
  {
    part: 'word/numbering.xml',
    elementQName: 'w:name',
    attributeQName: 'w:val',
    kind: 'style-name',
  },
  {
    part: 'word/fontTable.xml',
    elementQName: 'w:font',
    attributeQName: 'w:name',
    kind: 'font-name',
  },
  {
    part: 'word/fontTable.xml',
    elementQName: 'w:altName',
    attributeQName: 'w:val',
    kind: 'font-name',
  },
  {
    part: 'word/theme/theme1.xml',
    elementQName: 'a:theme',
    attributeQName: 'name',
    kind: 'theme-name',
  },
  {
    part: 'word/theme/theme1.xml',
    elementQName: 'a:clrScheme',
    attributeQName: 'name',
    kind: 'theme-name',
  },
  {
    part: 'word/theme/theme1.xml',
    elementQName: 'a:fontScheme',
    attributeQName: 'name',
    kind: 'theme-name',
  },
  {
    part: 'word/theme/theme1.xml',
    elementQName: 'a:latin',
    attributeQName: 'typeface',
    kind: 'font-name',
  },
  {
    part: 'word/theme/theme1.xml',
    elementQName: 'a:ea',
    attributeQName: 'typeface',
    kind: 'font-name',
  },
  {
    part: 'word/theme/theme1.xml',
    elementQName: 'a:cs',
    attributeQName: 'typeface',
    kind: 'font-name',
  },
] as const;

function hash(value: string | Buffer): string {
  return createHash('sha256').update(value).digest('hex');
}

function paragraphSurface(part: string, paragraph: number, inner: string): DocxSurface {
  const nodes = xmlElements(inner, 't');
  let cursor = 0;
  const runSlices = nodes.map((node, index) => {
    const text = decodeXmlText(node.inner);
    const slice = {
      childPath: `p[${paragraph}]/t[${index}]`,
      startUtf16: cursor,
      endUtf16: cursor + text.length,
    };
    cursor += text.length;
    return slice;
  });
  const text = nodes.map((node) => decodeXmlText(node.inner)).join('');
  const blockPath = `p[${paragraph}]`;
  return {
    part,
    paragraph,
    text,
    locator: {
      kind: 'docx-text',
      partName: part,
      blockPath,
      runSlices,
      logicalStartUtf16: 0,
      logicalEndUtf16: text.length,
      sourceSurfaceHashSha256: hash(`${part}\u0000${blockPath}\u0000${text}`),
      mapSha256: hash(JSON.stringify(runSlices)),
    },
  };
}

function textSurfaces(entries: readonly ZipEntry[]): DocxSurface[] {
  const surfaces: DocxSurface[] = [];
  for (const entry of entries) {
    if (
      !/^word\/(?:document|header\d+|footer\d+|footnotes|endnotes|comments)\.xml$/u.test(entry.name)
    )
      continue;
    const paragraphs = xmlElements(entry.data.toString('utf8'), 'p');
    for (let index = 0; index < paragraphs.length; index++)
      surfaces.push(paragraphSurface(entry.name, index, paragraphs[index]!.inner));
  }
  return surfaces;
}

function attrValue(opening: string, name: string): string | undefined {
  return new RegExp(`(?:\\s|:)${name}=["']([^"']*)["']`, 'u').exec(opening)?.[1];
}

function metadataReview(entries: readonly ZipEntry[]): DocxReviewItem[] {
  const result: DocxReviewItem[] = [];
  for (const entry of entries.filter((candidate) =>
    /^docProps\/(?:core|app|custom)\.xml$/u.test(candidate.name),
  )) {
    const xml = entry.data.toString('utf8');
    let occurrence = 0;
    for (const match of xml.matchAll(
      /<([A-Za-z_][\w.-]*(?::[A-Za-z_][\w.-]*)?)[^>]*>([^<]+)<\/\1>/gu,
    )) {
      const value = decodeXmlText(match[2]!);
      if (!value) continue;
      result.push({
        kind: 'metadata',
        part: entry.name,
        value,
        mandatoryReview: true,
        locator: {
          kind: 'ooxml-property',
          package: 'docx',
          partName: entry.name,
          propertyQName: match[1]!,
          occurrenceIndex0: occurrence++,
          logicalStartUtf16: 0,
          logicalEndUtf16: value.length,
          sourceSurfaceHashSha256: hash(`${entry.name}\u0000${match[1]}\u0000${value}`),
          mapSha256: hash(`${entry.name}\u0000${match.index}\u0000${value.length}`),
        },
      });
    }
  }
  return result;
}

function commentAuthorReview(entries: readonly ZipEntry[]): DocxReviewItem[] {
  const entry = entries.find((candidate) => candidate.name === 'word/comments.xml');
  if (!entry) return [];
  const result: DocxReviewItem[] = [];
  for (const comment of entry.data.toString('utf8').matchAll(/<w:comment\b([^>]*)>/gu)) {
    const id = attrValue(comment[1]!, 'id');
    const author = attrValue(comment[1]!, 'author');
    if (!id || author === undefined) continue;
    const value = decodeXmlText(author);
    result.push({
      kind: 'comment-author',
      part: entry.name,
      value,
      mandatoryReview: true,
      locator: {
        kind: 'comment-author',
        package: 'docx',
        partName: entry.name,
        commentId: id,
        logicalStartUtf16: 0,
        logicalEndUtf16: value.length,
        sourceSurfaceHashSha256: hash(`${entry.name}\u0000${id}\u0000${value}`),
        mapSha256: hash(`${entry.name}\u0000${id}\u0000author`),
      },
    });
  }
  return result;
}

function imageDimensions(
  data: Buffer,
  mime: DocxMediaInventory['mime'],
): { width: number; height: number } | null {
  if (
    mime === 'image/png' &&
    data.length >= 24 &&
    data.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
  )
    return { width: data.readUInt32BE(16), height: data.readUInt32BE(20) };
  if (mime === 'image/jpeg') {
    for (let offset = 2; offset + 9 < data.length;) {
      if (data[offset] !== 0xff) return null;
      const marker = data[offset + 1]!;
      const length = data.readUInt16BE(offset + 2);
      if (marker >= 0xc0 && marker <= 0xc3 && length >= 7)
        return { height: data.readUInt16BE(offset + 5), width: data.readUInt16BE(offset + 7) };
      offset += 2 + length;
    }
  }
  return null;
}

function mediaInventory(
  entries: readonly ZipEntry[],
  relationships: ReturnType<typeof preflightOoxmlSnapshot>['relationships'],
): DocxMediaInventory[] {
  return entries
    .filter((entry) => /^word\/media\/[^/]+\.(?:png|jpe?g)$/iu.test(entry.name))
    .map((entry) => {
      const mime = /\.png$/iu.test(entry.name) ? 'image/png' : 'image/jpeg';
      const related = relationships
        .filter((relationship) => relationship.target === entry.name)
        .map((relationship) => ({
          relsPart: relationship.relsPart,
          relationshipId: relationship.id,
          sourcePart: relationship.source,
        }));
      return {
        part: entry.name,
        sha256: hash(entry.data),
        mime,
        dimensions: imageDimensions(entry.data, mime),
        relationships: related,
        location: related.map((relationship) => relationship.sourcePart),
        mandatoryReview: true,
        decision: 'pending',
      };
    });
}

function scan(source: Buffer): DocxExtraction {
  const entries = preflightOoxml(source, 'docx');
  const snapshot = preflightOoxmlSnapshot(source, 'docx');
  const hyperlinks = snapshot.relationships
    .filter((relationship) => relationship.type.endsWith('/hyperlink'))
    .map((relationship) => {
      const target = relationship.target;
      return {
        target,
        mandatoryReview: true as const,
        locator: {
          kind: 'relationship-target' as const,
          package: 'docx' as const,
          relsPartName: relationship.relsPart,
          relationshipId: relationship.id,
          targetMode: relationship.targetMode,
          logicalStartUtf16: 0,
          logicalEndUtf16: target.length,
          sourceSurfaceHashSha256: hash(
            `${relationship.relsPart}\u0000${relationship.id}\u0000${target}`,
          ),
          mapSha256: hash(`${relationship.source}\u0000${relationship.id}`),
        },
      };
    });
  const reviewItems = [
    ...commentAuthorReview(entries),
    ...metadataReview(entries),
    ...extractAttributeSurfaces(entries, 'docx', DOCX_ATTRIBUTE_SURFACES),
    ...hyperlinks.map((link) => ({
      kind: 'hyperlink' as const,
      part: link.locator.relsPartName,
      value: link.target,
      locator: link.locator,
      mandatoryReview: true as const,
    })),
  ];
  const manualReview = [
    ...new Set([
      ...reviewItems.map((item) => `${item.kind}:${item.part}`),
      ...entries
        .filter((entry) => entry.name === 'word/theme/theme1.xml')
        .map((entry) => entry.name),
      ...entries
        .filter((entry) => /^word\/media\//u.test(entry.name))
        .map((entry) => `media:${entry.name}`),
    ]),
  ];
  return {
    surfaces: textSurfaces(entries),
    reviewItems,
    hyperlinks,
    media: mediaInventory(entries, snapshot.relationships),
    manualReview,
    entryCount: entries.length,
  };
}

function rewritePart(xml: string, operations: readonly DocxTextOperation[]): string {
  const paragraphs = xmlElements(xml, 'p');
  const groups = new Map<number, DocxTextOperation[]>();
  for (const operation of operations) {
    const paragraph = /^p\[(\d+)\]$/u.exec(operation.locator.blockPath)?.[1];
    if (paragraph === undefined) throw new Error('DOCX block path is invalid');
    const index = Number(paragraph);
    const values = groups.get(index) ?? [];
    values.push(operation);
    groups.set(index, values);
  }
  let out = xml;
  for (const [paragraphIndex, group] of [...groups.entries()].sort(
    ([left], [right]) => right - left,
  )) {
    const paragraph = paragraphs[paragraphIndex];
    if (!paragraph) throw new Error('DOCX paragraph locator not found');
    const current = paragraphSurface(group[0]!.locator.partName, paragraphIndex, paragraph.inner);
    for (const operation of group) {
      if (
        operation.locator.sourceSurfaceHashSha256 !== current.locator.sourceSurfaceHashSha256 ||
        operation.locator.mapSha256 !== current.locator.mapSha256
      )
        throw new OoxmlBlockedError(['stale-or-forged-docx-locator']);
    }
    const nodes = xmlElements(paragraph.inner, 't');
    const values = nodes.map((node) => decodeXmlText(node.inner));
    let changed = current.text;
    let boundary = changed.length + 1;
    for (const operation of [...group].sort(
      (left, right) => right.locator.logicalStartUtf16 - left.locator.logicalStartUtf16,
    )) {
      const { logicalStartUtf16: start, logicalEndUtf16: end } = operation.locator;
      if (start < 0 || end < start || end > changed.length || end > boundary)
        throw new OoxmlBlockedError(['invalid-or-overlapping-docx-locator']);
      changed = changed.slice(0, start) + operation.replacement + changed.slice(end);
      boundary = start;
    }
    const replacements: string[] = [];
    let cursor = 0;
    for (let index = 0; index < nodes.length; index++) {
      const take =
        index === nodes.length - 1
          ? changed.length - cursor
          : Math.min(values[index]!.length, changed.length - cursor);
      replacements.push(changed.slice(cursor, cursor + take));
      cursor += take;
    }
    let inner = paragraph.inner;
    for (let index = nodes.length - 1; index >= 0; index--) {
      const node = nodes[index]!;
      inner =
        inner.slice(0, node.innerStart) +
        escapeXmlText(replacements[index] ?? '') +
        inner.slice(node.innerEnd);
    }
    out = out.slice(0, paragraph.innerStart) + inner + out.slice(paragraph.innerEnd);
  }
  return out;
}

function independentReopen(artifact: Buffer): DocxExtraction {
  const directory = mkdtempSync(join(tmpdir(), 'hans-safedoc-docx-'));
  const path = join(directory, 'artifact.docx');
  try {
    writeFileSync(path, artifact, { flag: 'wx', mode: 0o600 });
    const diskArtifact = readFileSync(path);
    verifyOoxmlReopen(diskArtifact, 'docx');
    return scan(diskArtifact);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
}

function verifyArtifact(source: Buffer, artifact: Buffer) {
  const sourceEntries = new Map(readZip(source).map((entry) => [entry.name, entry.data]));
  const artifactEntries = new Map(readZip(artifact).map((entry) => [entry.name, entry.data]));
  if (sourceEntries.size !== artifactEntries.size)
    throw new OoxmlBlockedError(['docx-entry-canary']);
  const unchangedEntries: string[] = [];
  const changedEntries: string[] = [];
  for (const [name, before] of sourceEntries) {
    const after = artifactEntries.get(name);
    if (!after) throw new OoxmlBlockedError(['docx-entry-canary']);
    if (before.equals(after)) unchangedEntries.push(name);
    else changedEntries.push(name);
  }
  preflightOoxmlSnapshot(artifact, 'docx');
  return { unchangedEntries: unchangedEntries.sort(), changedEntries: changedEntries.sort() };
}

function rewrite(source: Buffer, operations: readonly DocxTextOperation[]): Buffer {
  const entries = preflightOoxml(source, 'docx');
  const grouped = new Map<string, DocxTextOperation[]>();
  for (const operation of operations) {
    const group = grouped.get(operation.locator.partName) ?? [];
    group.push(operation);
    grouped.set(operation.locator.partName, group);
  }
  const changes = new Map<string, Buffer>();
  for (const [part, partOperations] of grouped) {
    const entry = entries.find((candidate) => candidate.name === part);
    if (!entry) throw new OoxmlBlockedError(['docx-locator-part-not-found']);
    changes.set(part, Buffer.from(rewritePart(entry.data.toString('utf8'), partOperations)));
  }
  const artifact = replaceZipEntries(source, changes);
  independentReopen(artifact);
  assertOoxmlGraphConservation(source, artifact, 'docx');
  const canary = verifyArtifact(source, artifact);
  if (canary.changedEntries.some((entry) => !changes.has(entry)))
    throw new OoxmlBlockedError(['docx-entry-canary']);
  return artifact;
}

export const docxAdapter = {
  id: 'hsd-docx-v1.1',
  version: '1.1.0' as const,
  extract: scan,
  rewrite,
  reopen: independentReopen,
  residual(
    artifact: Buffer,
    checks: readonly (string | { needle: string; decision: 'replace' | 'retain' })[],
  ) {
    const extraction = independentReopen(artifact);
    const logical = [
      ...extraction.surfaces.map((surface) => surface.text),
      ...extraction.reviewItems.map((item) => item.value),
      ...extraction.hyperlinks.map((link) => link.target),
    ].join('\n');
    return checks
      .filter((check) => typeof check === 'string' || check.decision === 'replace')
      .map((check) => (typeof check === 'string' ? check : check.needle))
      .filter((needle) => logical.includes(needle));
  },
  verifyReopen: (artifact: Buffer) => verifyOoxmlReopen(artifact, 'docx'),
  verifyArtifact,
};

export { OoxmlBlockedError };
