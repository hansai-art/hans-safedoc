import { createHash } from 'node:crypto';
import { preflightOoxmlSnapshot } from './preflight.js';
import { OoxmlBlockedError } from './zip-guard.js';

export interface OoxmlReopenManifest {
  package: 'docx' | 'xlsx';
  entryCount: number;
  entryHashes: Readonly<Record<string, string>>;
  relationshipGraphSha256: string;
  packageSha256: string;
}

function hash(value: string | Buffer): string {
  return createHash('sha256').update(value).digest('hex');
}

const REQUIRED_PARTS = {
  docx: ['[Content_Types].xml', '_rels/.rels', 'word/document.xml'],
  xlsx: ['[Content_Types].xml', '_rels/.rels', 'xl/workbook.xml', 'xl/_rels/workbook.xml.rels'],
} as const;

export function verifyOoxmlReopen(
  artifact: Buffer,
  packageKind: 'docx' | 'xlsx',
): OoxmlReopenManifest {
  const snapshot = preflightOoxmlSnapshot(Buffer.from(artifact), packageKind);
  const byName = new Map(snapshot.entries.map((entry) => [entry.name, entry.data]));
  const missing = REQUIRED_PARTS[packageKind].filter((part) => !byName.has(part));
  if (missing.length > 0)
    throw new OoxmlBlockedError(missing.map((part) => `${packageKind}-required-part:${part}`));
  if (
    packageKind === 'xlsx' &&
    !snapshot.relationships.some(
      (relationship) =>
        relationship.source === 'xl/workbook.xml' && relationship.type.endsWith('/worksheet'),
    )
  )
    throw new OoxmlBlockedError(['xlsx-required-worksheet-relationship']);

  const entryHashes = Object.fromEntries(
    snapshot.entries
      .map((entry) => [entry.name, hash(entry.data)] as const)
      .sort(([left], [right]) => left.localeCompare(right)),
  );
  const relationshipGraphSha256 = hash(
    JSON.stringify(
      snapshot.relationships
        .map((relationship) => ({
          relsPart: relationship.relsPart,
          id: relationship.id,
          source: relationship.source,
          target: relationship.target,
          type: relationship.type,
          targetMode: relationship.targetMode,
        }))
        .sort((left, right) =>
          `${left.relsPart}\u0000${left.id}`.localeCompare(`${right.relsPart}\u0000${right.id}`),
        ),
    ),
  );
  return {
    package: packageKind,
    entryCount: snapshot.entries.length,
    entryHashes,
    relationshipGraphSha256,
    packageSha256: hash(artifact),
  };
}
