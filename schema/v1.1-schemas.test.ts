import Ajv2020, { type ValidateFunction } from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';
import { readdir, readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = resolve(import.meta.dirname, '..');
const schemasDir = resolve(root, 'packages/schemas/json');
const examplesDir = resolve(root, 'packages/schemas/examples/v1.1');
const expectedNames = [
  'artifact-verification-v1.1',
  'extraction-manifest-v1.1',
  'format-inventory-v1.1',
  'format-job-index-v1.1',
  'format-occurrence-v1.1',
  'format-transaction-journal-v1.1',
  'media-review-v1.1',
  'rewrite-plan-v1.1',
] as const;

async function loadValidators(): Promise<Map<string, ValidateFunction>> {
  const ajv = new Ajv2020({ allErrors: true, strict: true });
  addFormats(ajv);
  const validators = new Map<string, ValidateFunction>();
  for (const name of expectedNames) {
    const schema = JSON.parse(
      await readFile(resolve(schemasDir, `${name}.schema.json`), 'utf8'),
    ) as object;
    const validator = ajv.compile(schema);
    validators.set(name, validator);
  }
  return validators;
}

function expectInvalid(validator: ValidateFunction, value: unknown): void {
  expect(validator(value), JSON.stringify(validator.errors)).toBe(false);
}

describe('Hans SafeDoc v1.1 JSON schemas', () => {
  it('ships exactly the eight independent §23.2 schemas and valid examples', async () => {
    const schemaFiles = (await readdir(schemasDir))
      .filter((name) => name.endsWith('.schema.json'))
      .sort();
    expect(schemaFiles).toEqual(expectedNames.map((name) => `${name}.schema.json`));

    const validators = await loadValidators();
    for (const name of expectedNames) {
      const example = JSON.parse(
        await readFile(resolve(examplesDir, `${name}.example.json`), 'utf8'),
      ) as unknown;
      const validator = validators.get(name)!;
      expect(validator(example), `${name}: ${JSON.stringify(validator.errors)}`).toBe(true);
    }
  });

  it('requires exact tagged format locators and forbids open object shapes', async () => {
    const validators = await loadValidators();
    const validator = validators.get('format-occurrence-v1.1')!;
    const example = JSON.parse(
      await readFile(resolve(examplesDir, 'format-occurrence-v1.1.example.json'), 'utf8'),
    ) as Record<string, unknown>;

    const withoutLocator = structuredClone(example) as Record<string, unknown>;
    delete withoutLocator.formatLocatorV11;
    expectInvalid(validator, withoutLocator);

    const mixedLocator = structuredClone(example) as Record<string, unknown>;
    mixedLocator.formatLocatorV11 = {
      kind: 'txt',
      sourceSurfaceHashSha256: 'a'.repeat(64),
      rawByteStart: 0,
      rawByteEnd: 1,
      logicalStartUtf16: 0,
      logicalEndUtf16: 1,
      segmentId: 'segment-1',
      mapSha256: 'b'.repeat(64),
      rowIndex0: 0,
    };
    expectInvalid(validator, mixedLocator);

    for (const name of expectedNames) {
      const schema = JSON.parse(
        await readFile(resolve(schemasDir, `${name}.schema.json`), 'utf8'),
      ) as Record<string, unknown>;
      const visit = (value: unknown): void => {
        if (Array.isArray(value)) {
          value.forEach(visit);
          return;
        }
        if (!value || typeof value !== 'object') return;
        const record = value as Record<string, unknown>;
        if (record.type === 'object') expect(record.additionalProperties, name).toBe(false);
        Object.values(record).forEach(visit);
      };
      visit(schema);
    }

    const occurrenceSchema = JSON.parse(
      await readFile(resolve(schemasDir, 'format-occurrence-v1.1.schema.json'), 'utf8'),
    ) as {
      required: string[];
      $defs: { formatLocatorV11: { oneOf: Array<Record<string, unknown>> } };
    };
    expect(occurrenceSchema.required).toContain('formatLocatorV11');
    expect(occurrenceSchema.required).toContain('artifactLocatorV11');
    expect(occurrenceSchema.$defs.formatLocatorV11.oneOf).toHaveLength(16);
  });

  it('rejects unknown fields at every schema root and unsupported versions', async () => {
    const validators = await loadValidators();
    for (const name of expectedNames) {
      const example = JSON.parse(
        await readFile(resolve(examplesDir, `${name}.example.json`), 'utf8'),
      ) as Record<string, unknown>;
      const validator = validators.get(name)!;
      expectInvalid(validator, { ...example, leaked: 'secret' });
      expectInvalid(validator, { ...example, schemaVersion: '1.0.0' });
      const withoutAdapterVersion = { ...example };
      delete withoutAdapterVersion.adapterVersion;
      expectInvalid(validator, withoutAdapterVersion);
    }

    const manifestValidator = validators.get('extraction-manifest-v1.1')!;
    const manifest = JSON.parse(
      await readFile(resolve(examplesDir, 'extraction-manifest-v1.1.example.json'), 'utf8'),
    ) as { surfaces: Array<Record<string, unknown>> };
    manifest.surfaces[0]!.containerPart = '/Users/private/source.txt';
    expectInvalid(manifestValidator, manifest);
  });
});
