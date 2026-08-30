import {
  OOXML_PARTS_CSV,
  OOXML_RELATIONSHIPS_CSV,
  OOXML_SURFACES_CSV,
} from './generated-contracts.js';

export type OfficeKind = 'docx' | 'xlsx';

export interface PartContract {
  package: OfficeKind;
  part_pattern: string;
  content_type: string;
  cardinality: string;
  policy: string;
}

export interface RelationshipContract {
  package: OfficeKind;
  source_part_pattern: string;
  target_part_pattern: string;
  type_uri: string;
  target_mode: 'Internal' | 'External';
  cardinality: string;
  policy: string;
  locator_kind: string;
}

export interface SurfaceContract {
  package: OfficeKind;
  part_pattern: string;
  namespace_uri: string;
  element_local_name: string;
  attribute_namespace_uri: string;
  attribute_local_name: string;
  node_kind: 'ELEMENT' | 'TEXT' | 'ATTRIBUTE';
  context_predicate: string;
  surface_class: 'SCAN_REWRITE' | 'SCAN_BLOCK' | 'PRESERVE_VALIDATED' | 'REJECT';
  locator_kind: string;
}

export interface OoxmlContracts {
  readonly parts: readonly PartContract[];
  readonly relationships: readonly RelationshipContract[];
  readonly surfaces: readonly SurfaceContract[];
}

function parseCsv(source: string): Record<string, string>[] {
  const lines = source.trim().split(/\r?\n/u);
  const [header, ...rows] = lines;
  if (!header) throw new Error('OOXML contract CSV has no header');
  const fields = header.split(',');
  return rows.filter(Boolean).map((line) => {
    const values = line.split(',');
    if (values.length !== fields.length) throw new Error('OOXML contract CSV is malformed');
    return Object.fromEntries(fields.map((field, index) => [field, values[index]!]));
  });
}

/**
 * The three normative CSV files are the single source of machine authority.
 * This loader is intentionally process-local and immutable: adapters never
 * accept caller-supplied allowlists or infer policy from a filename suffix.
 */
export function loadOoxmlContracts(): OoxmlContracts {
  const parts = parseCsv(OOXML_PARTS_CSV) as unknown as PartContract[];
  const relationships = parseCsv(OOXML_RELATIONSHIPS_CSV) as unknown as RelationshipContract[];
  const surfaces = parseCsv(OOXML_SURFACES_CSV) as unknown as SurfaceContract[];
  if (!parts.length || !relationships.length || !surfaces.length)
    throw new Error('OOXML contract CSV is empty');
  return Object.freeze({
    parts: Object.freeze(parts.map((part) => Object.freeze(part))),
    relationships: Object.freeze(relationships.map((relationship) => Object.freeze(relationship))),
    surfaces: Object.freeze(surfaces.map((surface) => Object.freeze(surface))),
  });
}

export const OOXML_CONTRACTS = loadOoxmlContracts();
