import Ajv2020 from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';
import { readdir, readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '../..');
const schemasDir = resolve(root, 'schemas');
const examplesDir = resolve(root, 'examples');
const schemaNames = (await readdir(schemasDir))
  .filter((name) => name.endsWith('.schema.json'))
  .sort();
if (schemaNames.length !== 18)
  throw new Error(`Expected exactly 18 schemas; found ${schemaNames.length}.`);

const ajv = new Ajv2020({ allErrors: true, strict: true });
addFormats(ajv);
for (const name of schemaNames) {
  ajv.addSchema(JSON.parse(await readFile(resolve(schemasDir, name), 'utf8')));
}

for (const schemaName of schemaNames) {
  const exampleName = schemaName.replace('.schema.json', '.example.json');
  const example = JSON.parse(await readFile(resolve(examplesDir, exampleName), 'utf8'));
  const schema = ajv.getSchema(`https://privacy-bridge.local/schemas/${schemaName}`);
  if (!schema) throw new Error(`Schema was not registered: ${schemaName}`);
  if (!schema(example))
    throw new Error(`${exampleName} violates ${schemaName}: ${ajv.errorsText(schema.errors)}`);
}
console.log(`Validated ${schemaNames.length} Draft 2020-12 schemas and examples.`);
