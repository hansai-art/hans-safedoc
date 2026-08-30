import Ajv2020 from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';
import { readdir, readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '../..');
const v10SchemasDir = resolve(root, 'schemas');
const v10ExamplesDir = resolve(root, 'examples');
const v11SchemasDir = resolve(import.meta.dirname, 'json');
const v11ExamplesDir = resolve(import.meta.dirname, 'examples/v1.1');

const expectedV10Names = [
  'audit-event.schema.json',
  'candidate.schema.json',
  'client-profile.schema.json',
  'detection-run.schema.json',
  'dictionary.schema.json',
  'encrypted-envelope.schema.json',
  'entity-map.schema.json',
  'export-manifest.schema.json',
  'job-key-envelope.schema.json',
  'job.schema.json',
  'lock.schema.json',
  'occurrence-map.schema.json',
  'path-map.schema.json',
  'restore-manifest.schema.json',
  'result-package.schema.json',
  'review-decision.schema.json',
  'store.schema.json',
  'transaction-journal.schema.json',
];
const expectedV11Names = [
  'artifact-verification-v1.1.schema.json',
  'extraction-manifest-v1.1.schema.json',
  'format-inventory-v1.1.schema.json',
  'format-job-index-v1.1.schema.json',
  'format-occurrence-v1.1.schema.json',
  'format-transaction-journal-v1.1.schema.json',
  'media-review-v1.1.schema.json',
  'rewrite-plan-v1.1.schema.json',
];

async function schemaNames(directory) {
  return (await readdir(directory)).filter((name) => name.endsWith('.schema.json')).sort();
}

function requireExactSet(version, actual, expected) {
  if (JSON.stringify(actual) !== JSON.stringify(expected))
    throw new Error(
      `${version} schema set mismatch; expected ${expected.join(', ')}; found ${actual.join(', ')}.`,
    );
}

const v10Names = await schemaNames(v10SchemasDir);
const v11Names = await schemaNames(v11SchemasDir);
requireExactSet('v1.0', v10Names, expectedV10Names);
requireExactSet('v1.1', v11Names, expectedV11Names);

const ajv = new Ajv2020({ allErrors: true, strict: true });
addFormats(ajv);

async function validateCollection(schemaDirectory, exampleDirectory, names) {
  for (const name of names)
    ajv.addSchema(JSON.parse(await readFile(resolve(schemaDirectory, name), 'utf8')));

  for (const schemaName of names) {
    const exampleName = schemaName.replace('.schema.json', '.example.json');
    const example = JSON.parse(await readFile(resolve(exampleDirectory, exampleName), 'utf8'));
    const idPath = schemaDirectory === v10SchemasDir ? schemaName : `v1.1/${schemaName}`;
    const schema = ajv.getSchema(`https://privacy-bridge.local/schemas/${idPath}`);
    if (!schema) throw new Error(`Schema was not registered: ${schemaName}`);
    if (!schema(example))
      throw new Error(`${exampleName} violates ${schemaName}: ${ajv.errorsText(schema.errors)}`);
  }
}

await validateCollection(v10SchemasDir, v10ExamplesDir, v10Names);
await validateCollection(v11SchemasDir, v11ExamplesDir, v11Names);
console.log(
  `Validated ${v10Names.length} v1.0 and ${v11Names.length} v1.1 Draft 2020-12 schemas and examples.`,
);
