import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import { generateSbom } from '../../scripts/generate-sbom.mjs';

const root = resolve(import.meta.dirname, '../..');
const temporaryPaths: string[] = [];

afterEach(async () => {
  await Promise.all(
    temporaryPaths.splice(0).map((path) => rm(path, { recursive: true, force: true })),
  );
});

describe('pnpm SBOM generation', () => {
  it('uses pnpm dependency resolution and writes a valid nonempty CycloneDX SBOM', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'safedoc-sbom-'));
    temporaryPaths.push(directory);
    const outputFile = join(directory, 'sbom.cdx.json');

    await generateSbom({ root, outputFile });

    const bom = JSON.parse(await readFile(outputFile, 'utf8'));
    expect(bom).toMatchObject({ bomFormat: 'CycloneDX', specVersion: '1.6', version: 1 });
    expect(bom.components).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ type: 'library', purl: expect.stringMatching(/^pkg:npm\//) }),
      ]),
    );
    expect(bom.metadata.component).toMatchObject({ name: 'hans-safedoc', type: 'application' });
    expect(bom.serialNumber).toMatch(/^urn:uuid:[0-9a-f-]{36}$/u);
  });
});
