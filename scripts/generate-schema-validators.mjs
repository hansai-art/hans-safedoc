import { readFile, readdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import process from 'node:process';
import Ajv2020 from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';
import standaloneCode from 'ajv/dist/standalone/index.js';

const root = resolve(import.meta.dirname, '..');
const schemaDir = resolve(root, 'schemas');
const output = resolve(root, 'packages/core/src/generated-schema-validators.mjs');
const names = {
  validateStore: 'store.schema.json',
  validateClientProfile: 'client-profile.schema.json',
  validateJob: 'job.schema.json',
  validateCandidate: 'candidate.schema.json',
  validateExportManifest: 'export-manifest.schema.json',
  validateResultPackage: 'result-package.schema.json',
  validateDictionaryRecord: 'dictionary.schema.json',
  validateEncryptedEnvelope: 'encrypted-envelope.schema.json',
};
const files = (await readdir(schemaDir)).filter((name) => name.endsWith('.schema.json')).sort();
const schemas = await Promise.all(
  files.map(async (name) => JSON.parse(await readFile(resolve(schemaDir, name), 'utf8'))),
);
const ajv = new Ajv2020({ allErrors: true, strict: true, code: { source: true, esm: true } });
addFormats(ajv);
for (const schema of schemas) ajv.addSchema(schema);
const exports = Object.fromEntries(
  Object.entries(names).map(([name, file]) => [
    name,
    `https://privacy-bridge.local/schemas/${file}`,
  ]),
);
const generated = `${standaloneCode(ajv, exports)}\n`;
if (process.argv.includes('--check')) {
  const current = await readFile(output, 'utf8').catch(() => '');
  if (current !== generated) {
    console.error('Generated schema validators are stale.');
    process.exitCode = 1;
  }
} else {
  await writeFile(output, generated);
}
