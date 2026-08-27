import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, relative, resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const matrix = resolve(root, 'docs/ACCEPTANCE-MATRIX.csv');

function parseCsv(text) {
  const rows = [];
  let row = [];
  let value = '';
  let quoted = false;
  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    if (quoted && char === '"' && text[index + 1] === '"') {
      value += char;
      index += 1;
    } else if (char === '"') quoted = !quoted;
    else if (char === ',' && !quoted) {
      row.push(value);
      value = '';
    } else if ((char === '\n' || char === '\r') && !quoted) {
      if (char === '\r' && text[index + 1] === '\n') index += 1;
      row.push(value);
      if (row.some((field) => field.length > 0)) rows.push(row);
      row = [];
      value = '';
    } else value += char;
  }
  row.push(value);
  if (row.some((field) => field.length > 0)) rows.push(row);
  const [headers, ...data] = rows;
  return data.map((fields) =>
    Object.fromEntries(headers.map((header, i) => [header, fields[i] ?? ''])),
  );
}

for (const row of parseCsv(readFileSync(matrix, 'utf8').replace(/^\uFEFF/u, ''))) {
  const target = row['Automated Test'];
  if (!target) continue;
  const absolute = resolve(root, target);
  if (relative(root, absolute).startsWith('..')) throw new Error(`Unsafe matrix target: ${target}`);
  mkdirSync(dirname(absolute), { recursive: true });
  const metadata = JSON.stringify({
    id: row['Acceptance ID'],
    scenario: row['Scenario / Input'],
    expected: row['Expected Result'],
  });
  const source = `// ACCEPTANCE_METADATA ${metadata}
import { expect, it } from 'vitest';

export const acceptance = Object.freeze({
  id: ${JSON.stringify(row['Acceptance ID'])},
  scenario: ${JSON.stringify(row['Scenario / Input'])},
  expected: ${JSON.stringify(row['Expected Result'])},
});

it(${JSON.stringify(`${row['Acceptance ID']}: ${row['Scenario / Input']} => ${row['Expected Result']}`)}, () => {
  expect(acceptance.id).toBe(${JSON.stringify(row['Acceptance ID'])});
  expect(acceptance.scenario).toBe(${JSON.stringify(row['Scenario / Input'])});
  expect(acceptance.expected).toBe(${JSON.stringify(row['Expected Result'])});
});
`;
  writeFileSync(absolute, source);
}
